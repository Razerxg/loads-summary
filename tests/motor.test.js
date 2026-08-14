import { describe, it, expect } from 'vitest';
import { trasladar, detalleTraslado, nivelesOrdenados, mkNivel, NIVEL_REF } from '../src/engine/traslado.js';
import { combinar, tablaCombos, envolvente, tablaHipotesis, calcular,
  cargaDs, cargasEnNivel } from '../src/engine/combinar.js';
import { COMP_KEYS } from '../src/constants/componentes.js';

const E = (o = {}) => ({ N: 0, Vx: 0, Vy: 0, Myy: 0, Mxx: 0, T: 0, ...o });

describe("traslado en profundidad", () => {
  it("h = 0 no cambia nada", () => {
    const e = E({ N: 10, Vx: 2, Vy: 3, Myy: 4, Mxx: 5, T: 6 });
    expect(trasladar(e, 0)).toEqual(e);
  });

  it("las fuerzas no cambian y los momentos crecen con V·h", () => {
    const e = E({ N: 10, Vx: 2, Vy: 3, Myy: 4, Mxx: 5, T: 6 });
    const r = trasladar(e, 1.5);
    expect(r.N).toBe(10);
    expect(r.Vx).toBe(2);
    expect(r.Vy).toBe(3);
    expect(r.Myy).toBeCloseTo(4 + 2 * 1.5, 10);      // 7
    expect(r.Mxx).toBeCloseTo(5 + 3 * 1.5, 10);      // 9.5
  });

  // EL TORSOR NO CAMBIA, y no es un olvido: el brazo `h` es paralelo al eje del torsor, y el
  // producto vectorial de dos vectores paralelos es cero. Habría torsión si el punto se
  // corriera en PLANTA, que es otro traslado y no el que hace esta app.
  it("el torsor NO cambia al bajar por el eje vertical", () => {
    const e = E({ Vx: 100, Vy: 100, T: 6 });
    expect(trasladar(e, 5).T).toBe(6);
  });

  it("cada momento se empareja con SU corte, no con el otro", () => {
    // Myy ← Vx, Mxx ← Vy. Cruzarlos da un resultado plausible y equivocado.
    const r = trasladar(E({ Vx: 10, Vy: 0, Myy: 0, Mxx: 0 }), 2);
    expect(r.Myy).toBe(20);
    expect(r.Mxx).toBe(0);
    const r2 = trasladar(E({ Vx: 0, Vy: 10, Myy: 0, Mxx: 0 }), 2);
    expect(r2.Myy).toBe(0);
    expect(r2.Mxx).toBe(20);
  });

  // El modo con signo puede RESTAR cuando el corte descarga el momento. Es el valor real
  // bajo la convención del modelo, y por eso es el patrón; la envolvente existe para cuando
  // los signos no son de fiar.
  it("con signo, un corte de signo contrario reduce el momento", () => {
    expect(trasladar(E({ Myy: 10, Vx: -2 }), 3).Myy).toBe(4);
  });

  it("la envolvente conservadora SIEMPRE hace crecer la magnitud", () => {
    for (const [M, V] of [[10, -2], [10, 2], [-10, 2], [-10, -2], [0, 5]]) {
      const r = trasladar(E({ Myy: M, Vx: V }), 3, "envolvente");
      expect(Math.abs(r.Myy)).toBeGreaterThanOrEqual(Math.abs(M));
      expect(Math.abs(r.Myy)).toBeCloseTo(Math.abs(M) + Math.abs(V) * 3, 10);
    }
  });

  it("la envolvente conserva el signo del momento original", () => {
    // Si cambiara de signo al bajar, la columna saltaría de + a − y se leería como un error.
    expect(trasladar(E({ Myy: -10, Vx: 2 }), 3, "envolvente").Myy).toBeLessThan(0);
    expect(trasladar(E({ Myy: 10, Vx: -2 }), 3, "envolvente").Myy).toBeGreaterThan(0);
  });

  it("el detalle permite reconstruir el número a mano", () => {
    const d = detalleTraslado(E({ Myy: 12.4, Vx: 3.1 }), 1.5);
    const myy = d.find(x => x.momento === "Myy");
    expect(myy).toMatchObject({ corte: "Vx", M0: 12.4, V: 3.1, h: 1.5 });
    expect(myy.M0 + myy.aporte).toBeCloseTo(myy.M1, 10);
  });

  it("un valor no numérico se trata como cero y no propaga NaN", () => {
    const r = trasladar({ Myy: undefined, Vx: "3", N: null }, 2);
    expect(Number.isFinite(r.Myy)).toBe(true);
    expect(r.Myy).toBe(0);
  });
});

describe("niveles", () => {
  it("el nudo va siempre primero y no se puede sacar", () => {
    const ns = nivelesOrdenados([mkNivel("Fondo", 1.2), mkNivel("Medio", 0.6)]);
    expect(ns[0]).toBe(NIVEL_REF);
    expect(ns.map(n => n.h)).toEqual([0, 0.6, 1.2]);
  });

  it("sin niveles declarados queda sólo el nudo", () => {
    expect(nivelesOrdenados([])).toHaveLength(1);
  });
});

describe("combinación", () => {
  const cargas = {
    PP: E({ N: 10, Vx: 1, Myy: 2 }),
    Do: E({ N: 20, Vx: 2, Myy: 4 }),
    "Wx+": E({ N: -5, Vx: 8, Myy: 30 }),
  };

  it("suma ponderada componente a componente", () => {
    const { esf } = combinar(cargas, { PP: 1.2, Do: 1.2 });
    expect(esf.N).toBeCloseTo(1.2 * 10 + 1.2 * 20, 10);
    expect(esf.Myy).toBeCloseTo(1.2 * 2 + 1.2 * 4, 10);
  });

  it("un factor cero es «no participa»", () => {
    const { esf } = combinar(cargas, { PP: 1, Do: 0 });
    expect(esf.N).toBe(10);
  });

  // El error más fácil de cometer —armar la matriz antes de importar, o importar una
  // planilla a la que le falta una hipótesis— y el que tiene la pinta exacta de un cálculo
  // correcto: la combinación sale sin viento y da bien.
  it("una hipótesis con factor pero sin cargas se INFORMA, no se ignora en silencio", () => {
    const { esf, faltan } = combinar(cargas, { Do: 1.2, S: 1.6 });
    expect(faltan).toEqual(["S"]);
    expect(esf.N).toBeCloseTo(24, 10);
  });

  it("todas las componentes existen aunque ninguna hipótesis las traiga", () => {
    const { esf } = combinar({}, {});
    expect(Object.keys(esf).sort()).toEqual([...COMP_KEYS].sort());
    expect(Object.values(esf).every(v => v === 0)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LA IDENTIDAD QUE SOSTIENE EL DISEÑO
//
// Se combina primero y se traslada después. Con el criterio CON SIGNO eso da exactamente lo
// mismo que trasladar cada hipótesis y después combinar, porque las dos operaciones son
// lineales:
//
//     Σᵢ φᵢ·(Mᵢ + Vᵢ·h)  =  Σᵢ φᵢ·Mᵢ  +  h·Σᵢ φᵢ·Vᵢ
//
// Es la clase de identidad que un refactor rompe sin que nada falle, así que va fijada.
// ═══════════════════════════════════════════════════════════════════════════════
describe("combinar y trasladar conmutan (con signo)", () => {
  const cargas = {
    PP: E({ N: 10, Vx: 1.3, Vy: -0.4, Myy: 2.1, Mxx: -0.7, T: 0.2 }),
    Do: E({ N: 20, Vx: -2.6, Vy: 3.1, Myy: 4.4, Mxx: 1.9, T: -0.5 }),
    "Wx+": E({ N: -5, Vx: 8.2, Vy: 0.6, Myy: 30.5, Mxx: -2.2, T: 1.1 }),
  };
  const f = { PP: 1.2, Do: 1.2, "Wx+": 1.0 };
  const h = 1.75;

  it("da el mismo resultado en las dos direcciones", () => {
    // combinar → trasladar (lo que hace la app)
    const A = trasladar(combinar(cargas, f).esf, h);
    // trasladar cada hipótesis → combinar
    const trasladadas = Object.fromEntries(
      Object.entries(cargas).map(([k, v]) => [k, trasladar(v, h)]));
    const B = combinar(trasladadas, f).esf;
    for (const k of COMP_KEYS) expect(A[k]).toBeCloseTo(B[k], 9);
  });

  // Con la ENVOLVENTE no conmutan, y por eso el orden importa: trasladar hipótesis por
  // hipótesis y después sumar magnitudes suma como desfavorables cosas que en la combinación
  // real se cancelan. La envolvente tiene que aplicarse sobre la solicitación REAL.
  it("con envolvente NO conmutan, y el orden de la app es el conservador correcto", () => {
    const A = trasladar(combinar(cargas, f).esf, h, "envolvente");
    const trasladadas = Object.fromEntries(
      Object.entries(cargas).map(([k, v]) => [k, trasladar(v, h, "envolvente")]));
    const B = combinar(trasladadas, f).esf;
    expect(Math.abs(A.Myy - B.Myy)).toBeGreaterThan(1e-6);
  });
});

describe("envolvente", () => {
  const filas = [
    { nombre: "C1", esf: E({ N: 10, Myy: 5 }) },
    { nombre: "C2", esf: E({ N: -3, Myy: 40 }) },
    { nombre: "C3", esf: E({ N: 25, Myy: -12 }) },
  ];

  it("da el máximo y el mínimo con el nombre de la combinación que los produce", () => {
    const e = envolvente(filas);
    expect(e.N.max).toEqual({ v: 25, en: "C3" });
    expect(e.N.min).toEqual({ v: -3, en: "C2" });
    expect(e.Myy.max).toEqual({ v: 40, en: "C2" });
    expect(e.Myy.min).toEqual({ v: -12, en: "C3" });
  });

  // Máximo y mínimo POR SEPARADO, no «el mayor en valor absoluto»: el N mínimo es el caso de
  // levantamiento y el máximo el de presión de contacto, y son dos verificaciones distintas.
  it("no colapsa máximo y mínimo en el mayor en módulo", () => {
    const e = envolvente(filas);
    expect(e.N.max.v).not.toBe(e.N.min.v);
  });

  it("sin filas no rompe", () => {
    const e = envolvente([]);
    expect(e.N).toEqual({ max: { v: 0, en: "—" }, min: { v: 0, en: "—" } });
  });
});

describe("tablas", () => {
  const cargas = { PP: E({ N: 10, Vx: 2, Myy: 1 }), Do: E({ N: 20, Vx: 4, Myy: 3 }) };
  const hips = ["PP", "Do", "S"];
  const combosU = [{ k: "a", f: { PP: 1.2, Do: 1.2 } }, { k: "b", f: {} }];
  const combosS = [{ k: "c", f: { PP: 1, Do: 1 } }];

  it("el resumen sale de la lista viva: una hipótesis sin datos aparece vacía", () => {
    const t = tablaHipotesis({ cargas, hips });
    expect(t.map(x => x.hip)).toEqual(["PP", "Do", "S"]);
    expect(t.find(x => x.hip === "S")).toMatchObject({ sinDatos: true, cero: true });
    // Una fila vacía se ve; una fila ausente, no.
    expect(t.find(x => x.hip === "S").esf.N).toBe(0);
  });

  it("las combinaciones se numeran con su prefijo y llevan su expresión", () => {
    const t = tablaCombos({ cargas, combos: combosU, pref: "ELU", hips });
    expect(t[0].nombre).toBe("ELU1");
    expect(t[0].expr).toContain("PP");
    expect(t[0].esf.N).toBeCloseTo(36, 10);
  });

  // Una combinación sin ninguna hipótesis da todo cero y entra igual en la envolvente: es un
  // error de armado, no un caso, y hay que poder verlo.
  it("una combinación vacía se marca", () => {
    const t = tablaCombos({ cargas, combos: combosU, pref: "ELU", hips });
    expect(t[1].vacia).toBe(true);
  });

  it("`calcular` devuelve las tres tablas, las dos envolventes y los avisos", () => {
    const r = calcular({ cargas, hips, combosU, combosS, h: 2 });
    expect(r.hipotesis).toHaveLength(3);
    expect(r.elu).toHaveLength(2);
    expect(r.els).toHaveLength(1);
    expect(r.envELU.N.max.en).toBe("ELU1");
    expect(r.vacias).toEqual(["ELU2"]);
    // trasladado 2 m: Myy = 1,2·1 + 1,2·3 = 4,8 ; Vx = 1,2·2 + 1,2·4 = 7,2 → 4,8 + 14,4
    expect(r.elu[0].esf.Myy).toBeCloseTo(4.8 + 7.2 * 2, 9);
    // y el sin trasladar queda disponible para comparar
    expect(r.elu[0].esf0.Myy).toBeCloseTo(4.8, 9);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EL PESO PROPIO DE LA FUNDACIÓN
//
// `Ds` no sale de la planilla y nunca va a salir: el modelo de CYPE termina en el nudo, que
// es la cara superior de la fundación. Aparece recién al bajar a la cota de desplante, y por
// eso su valor es del NIVEL y no del nudo.
// ═══════════════════════════════════════════════════════════════════════════════
describe("Ds — peso propio de la fundación", () => {
  const cargas = { PP: E({ N: 10, Vx: 2, Myy: 1 }), Do: E({ N: 20, Vx: 4, Myy: 3 }) };
  const hips = ["Ds", "PP", "Do"];
  const combosU = [{ k: "a", f: { Ds: 1.4, PP: 1.4, Do: 1.4 } }];
  const combosS = [{ k: "c", f: { Ds: 1, PP: 1, Do: 1 } }];

  it("es una fuerza vertical pura: sin cortes y sin momentos", () => {
    const d = cargaDs(35);
    expect(d.N).toBe(35);
    for (const k of COMP_KEYS.filter(x => x !== "N")) expect(d[k]).toBe(0);
  });

  // El signo importa: `N` es positiva en compresión sobre el apoyo, y el peso de la
  // fundación comprime. Cargarlo negativo lo restaría de la carga vertical.
  it("un Ds positivo AUMENTA el axial", () => {
    const sin = calcular({ cargas, hips, combosU, combosS, h: 1.5 });
    const con = calcular({ cargas, hips, combosU, combosS, h: 1.5, ds: 35 });
    expect(con.elu[0].esf.N).toBeCloseTo(sin.elu[0].esf.N + 1.4 * 35, 9);
  });

  // No es una suma al final: entra en la combinación y lleva SU coeficiente. Sumarlo después
  // daría el mismo número sólo cuando el factor vale 1, y en ELU nunca vale 1.
  it("entra con el factor de la combinación, no como suma posterior", () => {
    const u = calcular({ cargas, hips, combosU, combosS, h: 0, ds: 100 });
    const s = calcular({ cargas, hips, combosU, combosS, h: 0, ds: 100 });
    expect(u.elu[0].esf.N - u.els[0].esf.N).toBeCloseTo(
      (1.4 - 1) * (10 + 20 + 100), 9);
    expect(s.els[0].esf.N).toBeCloseTo(10 + 20 + 100, 9);
  });

  // En las combinaciones de levantamiento el peso de la fundación es ESTABILIZANTE, así que
  // minorarlo (0,9) es lo conservador. Se comprueba que el factor se respeta y no se fuerza 1.
  it("respeta el factor minorado de las combinaciones de levantamiento", () => {
    const r = calcular({
      cargas, hips, combosU: [{ k: "l", f: { Ds: 0.9, PP: 0.9 } }], combosS: [], h: 0, ds: 50,
    });
    expect(r.elu[0].esf.N).toBeCloseTo(0.9 * 10 + 0.9 * 50, 9);
  });

  // Como no tiene corte, trasladarlo es una operación nula. Eso es lo que permite inyectarlo
  // sin un camino aparte, y hay que dejarlo fijado: si algún día Ds llevara corte, este test
  // avisa que el traslado deja de ser inocuo.
  it("no aporta momento al trasladar, porque no tiene corte", () => {
    const sinDs = calcular({ cargas, hips, combosU, combosS, h: 2 });
    const conDs = calcular({ cargas, hips, combosU, combosS, h: 2, ds: 80 });
    expect(conDs.elu[0].esf.Myy).toBeCloseTo(sinDs.elu[0].esf.Myy, 9);
    expect(conDs.elu[0].esf.Mxx).toBeCloseTo(sinDs.elu[0].esf.Mxx, 9);
  });

  // Con ds = 0 la clave NO se agrega: el nivel de referencia no puede arrastrar una hipótesis
  // en cero que después haya que explicar en cada tabla.
  it("con ds = 0 la hipótesis no se inyecta", () => {
    expect(cargasEnNivel(cargas, 0)).not.toHaveProperty("Ds");
    expect(cargasEnNivel(cargas, 35)).toHaveProperty("Ds");
  });

  // En el nudo, Ds vale cero POR DEFINICIÓN —no hay fundación arriba— así que el aviso
  // genérico de «hipótesis con factor pero sin cargas» sería ruido en cada combinación.
  it("Ds nunca aparece en el aviso de hipótesis faltantes", () => {
    const r = calcular({ cargas, hips, combosU, combosS, h: 0, ds: 0 });
    expect(r.faltantes).not.toContain("Ds");
  });

  // Lo que SÍ hay que avisar es lo contrario: una cota en profundidad cuyas combinaciones
  // usan Ds y que no tiene el peso cargado. Ése es un olvido real y da un N menor y
  // perfectamente plausible.
  it("avisa cuando un nivel EN PROFUNDIDAD usa Ds y no lo tiene cargado", () => {
    expect(calcular({ cargas, hips, combosU, combosS, h: 1.5, ds: 0 }).sinDs).toBe(true);
    expect(calcular({ cargas, hips, combosU, combosS, h: 1.5, ds: 40 }).sinDs).toBe(false);
    // en el nudo no se avisa: ahí el cero es correcto
    expect(calcular({ cargas, hips, combosU, combosS, h: 0, ds: 0 }).sinDs).toBe(false);
    // y tampoco si las combinaciones no usan Ds
    expect(calcular({ cargas, hips, combosU: [{ k: "x", f: { PP: 1.4 } }], combosS: [],
      h: 1.5, ds: 0 }).sinDs).toBe(false);
  });

  // La primera versión limpiaba `Ds` sólo de la lista agregada, así que el aviso general
  // desaparecía pero CADA combinación seguía mostrando su ⚠. En el nivel de referencia —donde
  // Ds vale cero por definición— salían marcadas las cuarenta y ocho, y un aviso que aparece
  // siempre deja de leerse: el día que uno sea de verdad, ya nadie lo mira.
  it("Ds tampoco aparece en el aviso de CADA combinación", () => {
    const r = calcular({ cargas, hips, combosU, combosS, h: 0, ds: 0 });
    for (const f of [...r.elu, ...r.els]) {
      expect(f.faltan, `${f.nombre} marca Ds como faltante`).not.toContain("Ds");
    }
  });

  // Pero una hipótesis que SÍ falta de verdad se sigue marcando: el filtro es de `Ds`, no de
  // todo el aviso.
  it("una hipótesis realmente ausente se sigue marcando en su fila", () => {
    const r = calcular({
      cargas, hips: [...hips, "S"],
      combosU: [{ k: "a", f: { Ds: 1.2, PP: 1.2, S: 1.6 } }], combosS: [], h: 0, ds: 0,
    });
    expect(r.elu[0].faltan).toEqual(["S"]);
    expect(r.faltantes).toEqual(["S"]);
  });

  it("aparece en el resumen por hipótesis del nivel con su valor", () => {
    const r = calcular({ cargas, hips, combosU, combosS, h: 1.5, ds: 42 });
    const fila = r.hipotesis.find(x => x.hip === "Ds");
    expect(fila.esf.N).toBe(42);
    expect(fila.sinDatos).toBe(false);
  });
});
