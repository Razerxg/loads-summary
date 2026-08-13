import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { leerXlsx, leerCsv } from '../src/services/leerXlsx.js';
import {
  numLat, numerosDe, normComp, normHip, etiquetaDe, nudoDe,
  cargasPorNudo, cargasPorNudoDesdeTexto, matrizDesdeTexto, detectarOrden,
} from '../src/engine/importTabla.js';
import { HIPS_DEF } from '../src/constants/hipotesis.js';
import { COMP_KEYS } from '../src/constants/componentes.js';

const bufFixture = () => {
  const b = readFileSync(new URL('./fixtures/reacciones-4-nudos.xlsx', import.meta.url));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};

describe("lectura de números", () => {
  it("acepta coma y punto como separador decimal", () => {
    expect(numLat("12,40")).toBe(12.4);
    expect(numLat("12.40")).toBe(12.4);
    expect(numLat("1.234,5")).toBe(1234.5);
    expect(numLat("1,234.5")).toBe(1234.5);
  });

  // Excel guarda TODO valor chico en notación científica. Sin reconocerla entera, `1.79E-2`
  // se leía como dos números —el 1.8 y un -2 inventado— y la fila quedaba con un valor de
  // más, con todas sus componentes corridas un lugar. No fallaba nada.
  it("lee la notación científica de Excel como UN número", () => {
    expect(numLat("1.7999999999999999E-2")).toBeCloseTo(0.018, 6);
    expect(numerosDe("1.7999999999999999E-2")).toHaveLength(1);
    expect(numerosDe("-3.5E+2")).toEqual([-350]);
  });

  // «N4» es la referencia del nudo, no el número 4. Leerlo como número dejaba la fila con
  // un valor de más.
  it("una referencia de nudo NO es un número", () => {
    expect(numLat("N4")).toBeNull();
    expect(numerosDe("N12")).toEqual([]);
  });

  it("saca todos los números de una celda con varios pegados", () => {
    expect(numerosDe("|-6.233|-20.590|")).toEqual([-6.233, -20.59]);
  });
});

describe("nombres de columna", () => {
  it("reconoce las tres notaciones", () => {
    expect(normComp("Rz")).toBe("N");
    expect(normComp("Fz")).toBe("N");
    expect(normComp("N")).toBe("N");
    expect(normComp("Rx (kN)")).toBe("Vx");
    expect(normComp("My (kN·m)")).toBe("Myy");
    expect(normComp("Mx")).toBe("Mxx");
  });

  // «mxx» tiene que ganarle a «mx», o Mxx caería en Mxx igual pero por la razón equivocada
  // y cualquier alias nuevo rompería el desempate.
  it("las claves largas se prueban antes que las cortas", () => {
    expect(normComp("Mxx")).toBe("Mxx");
    expect(normComp("Myy")).toBe("Myy");
  });

  // EL TORSOR ES UNA COMPONENTE REAL en esta app. En `bases` se reconocía sólo para no
  // descolocar el resto de las columnas y después se descartaba.
  it("Mz es el torsor y se importa", () => {
    expect(normComp("Mz")).toBe("T");
    expect(normComp("Mz (kN·m)")).toBe("T");
    expect(normComp("T")).toBe("T");
  });

  it("«total» no se confunde con la columna T", () => {
    expect(normComp("total")).toBeNull();
  });
});

describe("nombres de hipótesis", () => {
  // El ± del viento distingue un sentido del otro. Una versión anterior partía por el guion
  // y «WX+» y «WX-» colapsaban los dos en «wx».
  it("conserva el sentido del viento", () => {
    expect(normHip("WX+", HIPS_DEF)).toBe("Wx+");
    expect(normHip("WX-", HIPS_DEF)).toBe("Wx-");
    expect(normHip("WY-", HIPS_DEF)).toBe("Wy-");
    expect(normHip("WX+", HIPS_DEF)).not.toBe(normHip("WX-", HIPS_DEF));
  });

  it("«Peso propio» es PP, y no se reparte en De/Do/Dt", () => {
    expect(normHip("Peso propio", HIPS_DEF)).toBe("PP");
  });

  it("«F1» es hipótesis, no una referencia de nudo", () => {
    expect(nudoDe(["F1", "1", "2"], HIPS_DEF)).toBeNull();
    expect(nudoDe(["N4", "1", "2"], HIPS_DEF)).toBe("N4");
  });

  // La diferencia de alcance con `bases`: una hipótesis que no está en la lista NO se
  // descarta. Tirarla dejaría la importación muda justo donde más se nota.
  it("una etiqueta desconocida se propone como hipótesis nueva", () => {
    const e = etiquetaDe(["", "V(90°)H1", "1.2", "3.4"], HIPS_DEF);
    expect(e.hip).toBe("V(90°)H1");
    expect(e.nueva).toBe(true);
  });

  it("una hipótesis conocida gana sobre la etiqueta cruda", () => {
    const e = etiquetaDe(["N1", "Peso propio", "1.2", "3.4"], HIPS_DEF);
    expect(e).toMatchObject({ hip: "PP", nueva: false });
  });

  it("la fila de unidades del encabezado no se toma por una hipótesis", () => {
    expect(etiquetaDe(["", "", "(kN)", "(kN)", "(kN·m)"], HIPS_DEF)).toBeNull();
  });
});

describe("la planilla real de cuatro nudos", () => {
  it("se lee y se parte en sus cuatro nudos", async () => {
    const { hojas } = await leerXlsx(bufFixture());
    const r = cargasPorNudo(hojas[0].matriz, HIPS_DEF);
    expect(r.ok).toBe(true);
    expect(r.nudos.map(n => n.nombre)).toEqual(["N1", "N4", "N6", "N10"]);
  });

  // El modo de falla que este test fija: un importador que recorra las filas de corrido sin
  // mirar la «Referencia» APLANA la planilla y devuelve 17 filas en vez de 4 × 17. La
  // hipótesis `De` aparece cuatro veces, gana la última, y los otros tres nudos se pierden
  // sin que se note: el resultado tiene la pinta exacta de una importación correcta.
  it("cada nudo trae sus 17 hipótesis completas, no una mezcla de todos", async () => {
    const { hojas } = await leerXlsx(bufFixture());
    const r = cargasPorNudo(hojas[0].matriz, HIPS_DEF);
    for (const n of r.nudos) {
      expect(n.filas).toHaveLength(17);
      expect(new Set(n.filas.map(f => f.hip)).size).toBe(17);
    }
    // y los nudos son DISTINTOS entre sí: si se hubieran aplanado, saldrían todos iguales
    const n1 = r.nudos[0].filas.find(f => f.hip === "De").vals;
    const n4 = r.nudos[1].filas.find(f => f.hip === "De").vals;
    expect(n1.N).not.toBe(n4.N);
  });

  it("mapea la notación de CYPE a la interna con los valores en su lugar", async () => {
    const { hojas } = await leerXlsx(bufFixture());
    const r = cargasPorNudo(hojas[0].matriz, HIPS_DEF);
    const pp = r.nudos[0].filas.find(f => f.hip === "PP").vals;
    // fila real de la planilla: Rx 0,553 · Ry 0,17 · Rz 3,18 · Mx −0,01 · My 0,59 · Mz 0
    expect(pp).toEqual({ Vx: 0.553, Vy: 0.17, N: 3.18, Mxx: -0.01, Myy: 0.59, T: 0 });
  });

  it("el peso propio queda como hipótesis propia y NO se suma a De/Do/Dt", async () => {
    const { hojas } = await leerXlsx(bufFixture());
    const r = cargasPorNudo(hojas[0].matriz, HIPS_DEF);
    const f = (h) => r.nudos[0].filas.find(x => x.hip === h).vals;
    expect(f("PP")).toBeDefined();
    // De viene de la planilla tal cual (4,536), sin el 3,18 del peso propio encima
    expect(f("De").N).toBe(4.536);
  });

  it("avisa que el encabezado viene como reacciones, porque el signo NO se traduce", async () => {
    const { hojas } = await leerXlsx(bufFixture());
    const r = cargasPorNudo(hojas[0].matriz, HIPS_DEF);
    expect(r.avisos.some(a => /no el SIGNO/i.test(a))).toBe(true);
  });
});

describe("el torsor viaja hasta el final", () => {
  // En `bases` esta columna se descartaba. Acá tiene que llegar con su valor.
  const TXT = `Referencia\tDescripción\tRx\tRy\tRz\tMx\tMy\tMz
N1\tDo\t1.0\t2.0\t10.0\t3.0\t4.0\t5.5
\tWx+\t-1.0\t0.0\t-2.0\t0.0\t-6.0\t-1.25`;

  it("Mz entra como T y con su valor", () => {
    const r = cargasPorNudoDesdeTexto(TXT, HIPS_DEF);
    expect(r.ok).toBe(true);
    const f = r.nudos[0].filas;
    expect(f.find(x => x.hip === "Do").vals.T).toBe(5.5);
    expect(f.find(x => x.hip === "Wx+").vals.T).toBe(-1.25);
  });

  it("las seis componentes entran, ninguna se pierde", () => {
    const r = cargasPorNudoDesdeTexto(TXT, HIPS_DEF);
    const v = r.nudos[0].filas.find(x => x.hip === "Do").vals;
    expect(Object.keys(v).sort()).toEqual([...COMP_KEYS].sort());
  });
});

describe("bloque sin encabezado", () => {
  // Sin la fila de nombres hay que deducir el orden. Asumir siempre el interno era el error:
  // en la tabla de CYPE el axial va TERCERO, y los valores entraban todos cambiados de
  // componente —el corte según X terminaba de axial— sin que nada fallara.
  it("deduce el orden de CYPE porque el axial domina y está tercero", () => {
    const M = matrizDesdeTexto(`Do\t1.0\t2.0\t50.0\t3.0\t4.0\t0.0
De\t0.5\t1.0\t40.0\t2.0\t3.0\t0.0`);
    const r = cargasPorNudo(M, HIPS_DEF);
    expect(r.orden).toBe("cype");
    expect(r.nudos[0].filas.find(f => f.hip === "Do").vals.N).toBe(50);
  });

  it("con el axial primero se queda con el orden interno", () => {
    const M = matrizDesdeTexto(`Do\t50.0\t2.0\t1.0\t3.0\t4.0\t0.0
De\t40.0\t1.0\t0.5\t2.0\t3.0\t0.0`);
    const r = cargasPorNudo(M, HIPS_DEF);
    expect(r.orden).toBe("interno");
    expect(r.nudos[0].filas.find(f => f.hip === "Do").vals.N).toBe(50);
  });

  it("se puede forzar el orden a mano y los valores se reasignan", () => {
    const M = matrizDesdeTexto(`Do\t1.0\t2.0\t50.0\t3.0\t4.0\t0.0`);
    const r = cargasPorNudo(M, HIPS_DEF, { orden: "interno" });
    expect(r.nudos[0].filas[0].vals.N).toBe(1);
  });
});

describe("disposición transpuesta", () => {
  it("transpone cuando las hipótesis están en el encabezado", () => {
    const r = cargasPorNudoDesdeTexto(`\tDe\tDo
N\t10\t20
Vx\t1\t2
Vy\t0.5\t0.7
Myy\t3\t4
Mxx\t5\t6
T\t0.1\t0.2`, HIPS_DEF);
    expect(r.ok).toBe(true);
    expect(r.transpuesto).toBe(true);
    const f = r.nudos[0].filas;
    expect(f.find(x => x.hip === "Do").vals).toEqual({ N: 20, Vx: 2, Vy: 0.7, Myy: 4, Mxx: 6, T: 0.2 });
  });
});

describe("celdas vacías al partir el texto", () => {
  // Con tabulaciones la celda vacía es POSICIONAL: Excel emite una tabulación por columna.
  // Descartarlas corría el bloque transpuesto una columna entera y la fila de `Do` salía con
  // los valores de `De` —tabla completa, números de la hipótesis equivocada—.
  it("con tabulaciones se conservan las vacías", () => {
    expect(matrizDesdeTexto("\tDe\tDo")).toEqual([["", "De", "Do"]]);
    expect(matrizDesdeTexto("N1\tPP\t1\n\tDe\t2")).toEqual([["N1", "PP", "1"], ["", "De", "2"]]);
  });

  // Con espacios NO se puede afirmar lo mismo: dos o más espacios seguidos pueden ser
  // alineación de una tabla de PDF, no una columna vacía.
  it("con espacios o punto y coma se siguen descartando", () => {
    expect(matrizDesdeTexto("De    1    2")).toEqual([["De", "1", "2"]]);
    expect(matrizDesdeTexto("De;;1")).toEqual([["De", "1"]]);
  });

  // Efecto lateral bienvenido: la fila con «Referencia» combinada queda del mismo ancho que
  // el encabezado, así que el mapeo por posición absoluta vuelve a ser válido.
  it("la fila con «Referencia» combinada conserva el ancho del encabezado", () => {
    const M = matrizDesdeTexto("Referencia\tDescripción\tRx\tRy\tRz\tMx\tMy\tMz\n"
      + "N1\tPeso propio\t1\t2\t3\t4\t5\t6\n"
      + "\tDe\t7\t8\t9\t10\t11\t12");
    expect(M[1]).toHaveLength(M[0].length);
    expect(M[2]).toHaveLength(M[0].length);
  });
});

describe("CSV", () => {
  it("detecta el punto y coma, que es lo que exporta Excel en español", () => {
    const M = leerCsv("Descripción;Rx;Ry;Rz;Mx;My;Mz\nDo;1;2;3;4;5;6");
    expect(M[1]).toEqual(["Do", "1", "2", "3", "4", "5", "6"]);
  });
});
