import { describe, it, expect } from 'vitest';
import { DEF_ELU, DEF_ELS, NORMATIVAS_ELU, NORMATIVAS_ELS, mkCombo } from '../src/constants/combosDef.js';
import { serializarCombos, leerCombos, aCombos } from '../src/engine/setCombos.js';
import {
  agregarHips, quitarHip, esAccidental, comboDesc, comboDescNatural,
  HIPS_DEF, HIP_CAT, rotuloHip, familiaHip,
} from '../src/constants/hipotesis.js';
import { celdaCsv, filasACsv, csvDeNivel } from '../src/services/exportarCsv.js';
import { COMPONENTES } from '../src/constants/componentes.js';

const TODOS = [
  ["patrón ELU", DEF_ELU], ["patrón ELS", DEF_ELS],
  ...Object.entries(NORMATIVAS_ELU).map(([k, v]) => [`ELU ${k}`, v.combos]),
  ...Object.entries(NORMATIVAS_ELS).map(([k, v]) => [`ELS ${k}`, v.combos]),
];

describe("los sets de combinación", () => {
  // ⚠ LA INVARIANTE DE DISEÑO DE ESTA APP.
  //
  // CYPE entrega el peso propio como hipótesis APARTE, así que una combinación que diga sólo
  // `1,2·Do` deja afuera el peso de la estructura. En `bases` esto no pasaba porque allá el
  // importador sumaba el peso propio dentro de De/Do/Dt. Acá no, y olvidarse de `PP` en una
  // fila da un total menor y perfectamente plausible: no falla nada, sólo falta peso.
  it("TODA combinación con peso de estado lleva PP con el MISMO factor", () => {
    for (const [nombre, set] of TODOS) {
      set.forEach((f, i) => {
        for (const D of ["De", "Do", "Dt"]) {
          if (f[D] === undefined) continue;
          expect(f.PP, `${nombre}[${i + 1}] usa ${D} sin PP: ${JSON.stringify(f)}`).toBeDefined();
          expect(f.PP, `${nombre}[${i + 1}]: PP ${f.PP} ≠ ${D} ${f[D]}`).toBe(f[D]);
        }
      });
    }
  });

  // ⚠ LA SEGUNDA INVARIANTE: `Ds` —el peso propio de la fundación— es una carga permanente
  // más, así que lleva EL MISMO FACTOR que el resto de los permanentes de esa combinación:
  // 1,4 donde va 1,4, y 0,9 en las de levantamiento, donde minorarlo es lo conservador.
  //
  // Hoy se deriva de `PP` con `conDs()`, así que este test no puede fallar por descuido al
  // escribir una fila. Está igual porque el día que alguien vuelva a escribirlos sueltos
  // —para dar a una combinación un `Ds` distinto— tiene que enterarse acá y no en una
  // memoria emitida: un `Ds` con el factor equivocado da un total plausible.
  it("TODA combinación con PP lleva Ds con el MISMO factor", () => {
    for (const [nombre, set] of TODOS) {
      set.forEach((f, i) => {
        if (f.PP === undefined) return;
        expect(f.Ds, `${nombre}[${i + 1}] tiene PP sin Ds: ${JSON.stringify(f)}`).toBeDefined();
        expect(f.Ds, `${nombre}[${i + 1}]: Ds ${f.Ds} ≠ PP ${f.PP}`).toBe(f.PP);
      });
    }
  });

  // En las de levantamiento el peso propio de la fundación es ESTABILIZANTE: el factor tiene
  // que quedar minorado, no en 1,0. Es el caso en que un Ds mal factorizado deja de ser
  // conservador, y por eso se comprueba aparte.
  it("las combinaciones de levantamiento minoran Ds junto con el resto de los permanentes", () => {
    for (const [nombre, set] of TODOS) {
      const lev = set.filter(f => f.PP !== undefined && f.PP < 1);
      for (const f of lev) {
        expect(f.Ds, `${nombre}: una combinación de levantamiento no minora Ds`).toBe(f.PP);
        expect(f.Ds).toBeLessThan(1);
      }
    }
    // y existe al menos una en cada set patrón, o el control no estaría probando nada
    expect(DEF_ELU.some(f => f.PP === 0.9)).toBe(true);
    expect(DEF_ELS.some(f => f.PP === 0.6)).toBe(true);
  });

  it("ninguna combinación queda vacía", () => {
    for (const [nombre, set] of TODOS) {
      set.forEach((f, i) => {
        expect(Object.values(f).some(v => v !== 0), `${nombre}[${i + 1}] está vacía`).toBe(true);
      });
    }
  });

  // Toda clave usada tiene que existir en el catálogo, o el encabezado de esa columna sale
  // sin rótulo y la combinación no se puede leer.
  it("sólo se usan hipótesis del catálogo", () => {
    const cat = new Set(HIP_CAT.map(h => h.k));
    for (const [nombre, set] of TODOS) {
      for (const f of set) for (const k of Object.keys(f)) {
        expect(cat.has(k), `${nombre} usa «${k}», que no está en el catálogo`).toBe(true);
      }
    }
  });

  // El viento se separó en cuatro sentidos justamente porque NO son intercambiables: uno
  // gobierna el levantamiento y el otro el deslizamiento. Meter dos en la misma combinación
  // arma un caso de carga que no existe.
  it("nunca hay dos sentidos de viento en la misma combinación", () => {
    const W = ["Wx+", "Wx-", "Wy+", "Wy-"];
    for (const [nombre, set] of TODOS) {
      set.forEach((f, i) => {
        const n = W.filter(k => (f[k] ?? 0) !== 0).length;
        expect(n, `${nombre}[${i + 1}] mezcla ${n} sentidos de viento`).toBeLessThanOrEqual(1);
      });
    }
  });

  it("el sismo va en UN eje por combinación", () => {
    const E = ["Eex", "Eey", "Eox", "Eoy"];
    for (const [nombre, set] of TODOS) {
      set.forEach((f, i) => {
        const n = E.filter(k => (f[k] ?? 0) !== 0).length;
        expect(n, `${nombre}[${i + 1}] aplica sismo en ${n} direcciones`).toBeLessThanOrEqual(1);
      });
    }
  });

  it("las accidentales sólo se combinan con operación", () => {
    for (const [nombre, set] of TODOS) {
      set.forEach((f, i) => {
        if (!(f.F1 || f.F2)) return;
        expect(f.Do, `${nombre}[${i + 1}] usa PSV sin operación`).toBeDefined();
      });
    }
  });

  it("el selector de normativa ofrece los mismos sets en ELU y ELS", () => {
    expect(Object.keys(NORMATIVAS_ELU)).toEqual(Object.keys(NORMATIVAS_ELS));
  });
});

describe("familias y descripciones", () => {
  it("una combinación con viento o sismo es accidental", () => {
    expect(esAccidental({ PP: 1.2, Do: 1.2 })).toBe(false);
    expect(esAccidental({ PP: 1.2, Do: 1.2, "Wx+": 1 })).toBe(true);
    expect(esAccidental({ PP: 1.2, Do: 1.2, Eox: 1 })).toBe(true);
    expect(esAccidental({ PP: 1.2, Do: 1.2, F1: 1 })).toBe(true);
  });

  // Una hipótesis del modelo que la app no conoce NUNCA cuenta como accidental: no hay forma
  // de saber qué es `Q1`, y suponerlo marcaría combinaciones al azar.
  it("una hipótesis fuera del catálogo no se marca como accidental", () => {
    expect(esAccidental({ "V(90°)H1": 1.5 })).toBe(false);
    expect(familiaHip("V(90°)H1")).toBe("otra");
  });

  it("el rótulo de una hipótesis desconocida es su propio nombre", () => {
    expect(rotuloHip("Q1")).toBe("Q1");
    expect(rotuloHip("Do")).toBe("Peso en operación");
  });

  it("la expresión respeta el orden de la lista viva y saltea los ceros", () => {
    const hips = ["PP", "Do", "Wx+"];
    expect(comboDesc({ "Wx+": 1, PP: 1.2, Do: 0 }, hips)).toBe("1,20·PP + 1,00·Wx+");
  });

  // Con el rótulo LARGO, una combinación corriente se describía como «Peso propio de la
  // fundación + Peso propio (del modelo) + Peso en operación + Sobrecarga de uso + Nieve +
  // viento» y estiraba cada fila de la memoria a seis renglones.
  it("la descripción en palabras usa el nombre corto", () => {
    expect(comboDescNatural({ PP: 1, Do: 1, "Wx+": 1 }, ["PP", "Do", "Wx+"]))
      .toBe("peso propio + operación + viento");
  });

  it("los cuatro vientos colapsan en una sola palabra", () => {
    const f = { Ds: 1, PP: 1, Do: 1, "Wx+": 1, "Wx-": 1, "Wy+": 1, "Wy-": 1 };
    expect(comboDescNatural(f, Object.keys(f)))
      .toBe("peso de fundación + peso propio + operación + viento");
  });

  it("una hipótesis fuera del catálogo entra con su propio nombre", () => {
    expect(comboDescNatural({ "V(90°)H1": 1.5 }, ["V(90°)H1"])).toBe("V(90°)H1");
  });

  // Todo el catálogo tiene nombre corto: si a una entrada nueva se le olvidara, la columna
  // «Acciones» de la memoria saldría con un hueco en vez de decir qué acción es.
  it("ninguna entrada del catálogo se queda sin nombre corto", () => {
    for (const h of HIP_CAT) {
      expect(h.corto, `«${h.k}» no tiene nombre corto`).toBeTruthy();
      expect(h.corto.length, `«${h.k}»: el corto no es más corto que el rótulo`)
        .toBeLessThanOrEqual(h.rotulo.length);
    }
  });
});

describe("lista viva de hipótesis", () => {
  // Las nuevas van AL FINAL. Reordenar movería todas las columnas de la matriz que el
  // usuario ya tiene escrita, y los factores quedarían debajo de otra hipótesis.
  it("agrega al final y conserva el orden de las que ya estaban", () => {
    const { hips, puestas } = agregarHips(["PP", "Do"], ["Q1", "PP", "Q2"]);
    expect(hips).toEqual(["PP", "Do", "Q1", "Q2"]);
    expect(puestas).toEqual(["Q1", "Q2"]);
  });

  it("no duplica una que ya está", () => {
    expect(agregarHips(["PP"], ["PP"]).puestas).toEqual([]);
  });

  // Sin limpiar el factor, la columna desaparecía de la pantalla pero la hipótesis seguía
  // sumando al total: la peor forma de equivocarse, porque es invisible.
  it("quitar una hipótesis borra TAMBIÉN su factor en todas las combinaciones", () => {
    const st = {
      hips: ["PP", "Do", "Wx+"],
      combosU: [mkCombo({ PP: 1.2, Do: 1.2, "Wx+": 1 })],
      combosS: [mkCombo({ PP: 1, "Wx+": 0.6 })],
    };
    const r = quitarHip("Wx+", st);
    expect(r.hips).toEqual(["PP", "Do"]);
    expect(r.combosU[0].f).toEqual({ PP: 1.2, Do: 1.2 });
    expect(r.combosS[0].f).toEqual({ PP: 1 });
  });
});

describe("guardar y traer el set de combinaciones", () => {
  it("ida y vuelta conserva los factores", () => {
    const combosU = DEF_ELU.slice(0, 4).map(f => mkCombo({ ...f }));
    const d = serializarCombos({ combosU, combosS: [], hips: HIPS_DEF });
    const r = leerCombos(JSON.stringify(d));
    expect(r.ok).toBe(true);
    expect(r.sets.ELU).toEqual(combosU.map(c => c.f));
  });

  it("no exporta la clave `k` de sesión", () => {
    const d = serializarCombos({ combosU: [mkCombo({ PP: 1 })], combosS: [], hips: HIPS_DEF });
    expect(d.sets.ELU[0]).not.toHaveProperty("k");
    // y al traerlo se generan claves nuevas
    const cs = aCombos(d.sets.ELU);
    expect(cs[0].k).toBeTruthy();
  });

  // `Number("")` vale CERO, que es exactamente la confusión que hay que evitar: una celda
  // vacía donde iba un factor no es un factor nulo, es un archivo incompleto.
  it("un factor ilegible ABORTA la importación en vez de valer cero", () => {
    const r = leerCombos(JSON.stringify({ ELU: [{ PP: "1,4" }] }));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no es un número/);
  });

  it("una celda vacía también aborta", () => {
    expect(leerCombos(JSON.stringify({ ELU: [{ PP: "" }] })).ok).toBe(false);
  });

  // LA DIFERENCIA CON `bases`: allá una hipótesis desconocida se descartaba avisando, porque
  // la lista es una constante del programa. Acá la lista es del proyecto y puede crecer.
  it("una hipótesis que este proyecto no tiene se CONSERVA y se informa", () => {
    const r = leerCombos(JSON.stringify({ ELU: [{ PP: 1.2, "V(90°)H1": 1.5 }] }));
    expect(r.ok).toBe(true);
    expect(r.sets.ELU[0]).toEqual({ PP: 1.2, "V(90°)H1": 1.5 });
    expect(r.hipotesis).toContain("V(90°)H1");
  });

  it("acepta un set exportado desde la app de bases y le saca el Ds", () => {
    const r = leerCombos(JSON.stringify({
      tipo: "bases.combos", sets: { ELU: [{ Ds: 1.2, Do: 1.2, "Wx+": 1 }] },
    }));
    expect(r.ok).toBe(true);
    expect(r.sets.ELU[0]).toEqual({ Do: 1.2, "Wx+": 1 });
    expect(r.avisos.some(a => /Ds/.test(a))).toBe(true);
  });

  it("rechaza un archivo que dice ser otra cosa", () => {
    expect(leerCombos(JSON.stringify({ tipo: "reacciones.proyecto", sets: {} })).ok).toBe(false);
  });

  it("avisa de las combinaciones sin ninguna hipótesis", () => {
    const r = leerCombos(JSON.stringify({ ELU: [{ PP: 1 }, {}] }));
    expect(r.ok).toBe(true);
    expect(r.avisos.some(a => /ELU2/.test(a))).toBe(true);
  });

  it("no es JSON → error legible, no una excepción", () => {
    expect(leerCombos("{no").ok).toBe(false);
  });
});

describe("exportación a CSV", () => {
  // Excel en español: separador `;` y coma decimal. Con punto decimal, abre con todos los
  // valores convertidos en texto —o en fechas— y hay que rehacerlo a mano.
  it("los números salen con coma decimal", () => {
    expect(celdaCsv(12.4)).toBe("12,4");
    expect(celdaCsv(-0.018)).toBe("-0,018");
  });

  it("entrecomilla lo que trae el separador y duplica las comillas internas", () => {
    expect(celdaCsv("a;b")).toBe('"a;b"');
    expect(celdaCsv('di "hola"')).toBe('"di ""hola"""');
  });

  it("un valor no finito sale vacío, no «NaN»", () => {
    expect(celdaCsv(NaN)).toBe("");
    expect(celdaCsv(Infinity)).toBe("");
    expect(celdaCsv(null)).toBe("");
  });

  it("lleva el BOM, o Excel rompe los acentos", () => {
    expect(filasACsv([["Descripción"]]).charCodeAt(0)).toBe(0xFEFF);
  });

  // Un CSV de momentos trasladados sin nudo, nivel, profundidad y criterio al lado no se
  // puede revisar ni seis meses después ni por otra persona.
  it("el encabezado dice en qué condiciones está calculado", () => {
    const esf = { N: 1, Vx: 2, Vy: 3, Myy: 4, Mxx: 5, T: 6 };
    const txt = csvDeNivel({
      proyecto: "Planta X", nudo: "N4",
      nivel: { nombre: "Fondo de zapata", h: 1.2 },
      modo: "Con signo (M + V·h)",
      comps: COMPONENTES,
      hipotesis: [{ hip: "Do", esf }],
      elu: [{ nombre: "ELU1", esf, expr: "1,20·PP" }],
      els: [{ nombre: "ELS1", esf, expr: "1,00·PP" }],
      envELU: Object.fromEntries(COMPONENTES.map(c => [c.k, { max: { v: 1, en: "ELU1" }, min: { v: 0, en: "ELU1" } }])),
      envELS: Object.fromEntries(COMPONENTES.map(c => [c.k, { max: { v: 1, en: "ELS1" }, min: { v: 0, en: "ELS1" } }])),
    });
    expect(txt).toContain("Planta X");
    expect(txt).toContain("N4");
    expect(txt).toContain("Fondo de zapata");
    expect(txt).toContain("1,2");
    expect(txt).toContain("Con signo");
    expect(txt).toContain("COMBINACIONES ELU");
    expect(txt).toContain("COMBINACIONES ELS");
    expect(txt).not.toContain("NaN");
  });
});
