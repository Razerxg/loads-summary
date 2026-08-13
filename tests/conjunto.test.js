import { describe, it, expect } from 'vitest';
import { sumarNudos, aportesPorNudo } from '../src/engine/conjunto.js';
import { combinar, calcular } from '../src/engine/combinar.js';
import { trasladar } from '../src/engine/traslado.js';
import { COMP_KEYS } from '../src/constants/componentes.js';

const E = (o = {}) => ({ N: 0, Vx: 0, Vy: 0, Myy: 0, Mxx: 0, T: 0, ...o });
const nudo = (nombre, cargas) => ({ id: nombre, nombre, cargas });

describe("suma de nudos sobre una misma fundación", () => {
  const A = nudo("N1", { PP: E({ N: 10, Vx: 1, Myy: 2, T: 0.5 }), "Wx+": E({ N: -5, Vx: 8, Myy: 30 }) });
  const B = nudo("N2", { PP: E({ N: 20, Vx: 2, Myy: 3, T: -0.5 }), "Wx+": E({ N: -7, Vx: 9, Myy: 40 }) });
  const C = nudo("N3", { PP: E({ N: 30, Vx: 3, Myy: 4, T: 1 }), "Wx+": E({ N: -9, Vx: 7, Myy: 20 }) });

  it("suma componente a componente, hipótesis por hipótesis", () => {
    const r = sumarNudos([A, B, C]);
    expect(r.cargas.PP).toEqual(E({ N: 60, Vx: 6, Myy: 9, T: 1 }));
    expect(r.cargas["Wx+"]).toEqual(E({ N: -21, Vx: 24, Myy: 90 }));
  });

  it("todas las componentes existen en el resultado, aunque ningún nudo las traiga", () => {
    const r = sumarNudos([nudo("N1", { PP: { N: 5 } })]);
    expect(Object.keys(r.cargas.PP).sort()).toEqual([...COMP_KEYS].sort());
    expect(r.cargas.PP.Vy).toBe(0);
  });

  it("un nudo excluido de la lista no aporta", () => {
    const r = sumarNudos([A, C]);
    expect(r.cargas.PP.N).toBe(40);
  });

  it("sin nudos no rompe, y lo avisa", () => {
    const r = sumarNudos([]);
    expect(r.cargas).toEqual({});
    expect(r.avisos.some(a => /ningún nudo/i.test(a))).toBe(true);
  });

  it("recoge la unión de las hipótesis de todos los nudos", () => {
    const D = nudo("N4", { Do: E({ N: 5 }) });
    const r = sumarNudos([A, D]);
    expect(r.hips).toEqual(["PP", "Wx+", "Do"]);
    // la que sólo trae uno entra igual, con su valor
    expect(r.cargas.Do.N).toBe(5);
  });

  // ⚠ EL AVISO QUE JUSTIFICA TODO EL `detalle`.
  //
  // Si tres de veinte nudos no traen `Wx+`, el viento del conjunto sale un 15 % bajo. El
  // número es plausible, no rompe nada, y una suma de diecisiete valores no se revisa a ojo.
  it("avisa cuándo una hipótesis falta en algunos nudos", () => {
    const D = nudo("N4", { PP: E({ N: 40 }) });          // sin Wx+
    const r = sumarNudos([A, B, D]);
    expect(r.detalle["Wx+"].sin).toEqual(["N4"]);
    expect(r.avisos.some(a => /Wx\+/.test(a) && /N4/.test(a))).toBe(true);
    // y la suma efectivamente sale sin ese aporte, que es justamente el riesgo
    expect(r.cargas["Wx+"].N).toBe(-12);
  });

  it("no avisa nada cuando todos los nudos traen todas las hipótesis", () => {
    expect(sumarNudos([A, B, C]).avisos).toEqual([]);
  });

  it("los aportes por nudo permiten reconstruir la suma a mano", () => {
    const ap = aportesPorNudo([A, B, C], "PP");
    expect(ap.map(x => x.nombre)).toEqual(["N1", "N2", "N3"]);
    expect(ap.reduce((s, x) => s + (x.esf?.N ?? 0), 0)).toBe(60);
  });

  it("un nudo sin la hipótesis se marca con esfuerzo nulo, no con ceros indistinguibles", () => {
    const D = nudo("N4", { PP: E({ N: 40 }) });
    expect(aportesPorNudo([D], "Wx+")[0].esf).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LA INVARIANTE QUE HACE SEGURO SUMAR ANTES DE COMBINAR
//
// Se suma POR HIPÓTESIS y después se combina. Al revés —combinar cada nudo y sumar las
// combinaciones— da el mismo número, porque las dos operaciones son lineales; pero sólo se
// puede afirmar mientras la combinación siga siendo una suma ponderada. Si algún día
// apareciera un criterio no lineal (una envolvente, un máximo), este test avisa que el orden
// deja de ser indistinto y que sumar por hipótesis es el único correcto: sumar combinaciones
// ya armadas mezclaría casos que no ocurren a la vez.
// ═══════════════════════════════════════════════════════════════════════════════
describe("sumar y combinar conmutan", () => {
  const ns = [
    nudo("N1", { PP: E({ N: 10, Vx: 1.3, Vy: -0.4, Myy: 2.1, Mxx: -0.7, T: 0.2 }),
      Do: E({ N: 20, Vx: -2.6, Vy: 3.1, Myy: 4.4, Mxx: 1.9, T: -0.5 }),
      "Wx+": E({ N: -5, Vx: 8.2, Vy: 0.6, Myy: 30.5, Mxx: -2.2, T: 1.1 }) }),
    nudo("N2", { PP: E({ N: 14, Vx: 0.9, Vy: 0.3, Myy: 1.4, Mxx: 0.5, T: -0.1 }),
      Do: E({ N: 26, Vx: 1.1, Vy: -2.2, Myy: 3.3, Mxx: -1.1, T: 0.4 }),
      "Wx+": E({ N: -8, Vx: 6.4, Vy: -0.9, Myy: 22.7, Mxx: 3.1, T: -0.8 }) }),
    nudo("N3", { PP: E({ N: 18, Vx: -0.5, Vy: 1.7, Myy: -0.9, Mxx: 2.4, T: 0.6 }),
      Do: E({ N: 31, Vx: 3.4, Vy: 0.8, Myy: 5.2, Mxx: 0.3, T: -0.2 }),
      "Wx+": E({ N: -11, Vx: 7.1, Vy: 2.5, Myy: 18.9, Mxx: -4.3, T: 0.9 }) }),
  ];
  const f = { PP: 1.2, Do: 1.2, "Wx+": 1.0 };

  it("da el mismo resultado en las dos direcciones", () => {
    // sumar → combinar (lo que hace la app)
    const A = combinar(sumarNudos(ns).cargas, f).esf;
    // combinar cada nudo → sumar los totales
    const B = ns.map(n => combinar(n.cargas, f).esf)
      .reduce((acc, e) => {
        for (const k of COMP_KEYS) acc[k] += e[k];
        return acc;
      }, E());
    for (const k of COMP_KEYS) expect(A[k]).toBeCloseTo(B[k], 9);
  });

  // Y con el traslado en el medio también, que es el pipeline completo de la app:
  // sumar → combinar → trasladar.
  it("el traslado tampoco altera la equivalencia", () => {
    const h = 1.75;
    const A = trasladar(combinar(sumarNudos(ns).cargas, f).esf, h);
    const B = ns.map(n => trasladar(combinar(n.cargas, f).esf, h))
      .reduce((acc, e) => {
        for (const k of COMP_KEYS) acc[k] += e[k];
        return acc;
      }, E());
    for (const k of COMP_KEYS) expect(A[k]).toBeCloseTo(B[k], 9);
  });
});

describe("el conjunto en el pipeline completo", () => {
  const ns = [
    nudo("N1", { PP: E({ N: 10, Vx: 2, Myy: 1 }) }),
    nudo("N2", { PP: E({ N: 20, Vx: 4, Myy: 3 }) }),
  ];

  it("las tablas del conjunto son las de la resultante, no las de un nudo", () => {
    const { cargas } = sumarNudos(ns);
    const r = calcular({
      cargas, hips: ["Ds", "PP"],
      combosU: [{ k: "a", f: { Ds: 1.4, PP: 1.4 } }], combosS: [], h: 0,
    });
    expect(r.elu[0].esf.N).toBeCloseTo(1.4 * 30, 9);
    expect(r.elu[0].esf.Vx).toBeCloseTo(1.4 * 6, 9);
  });

  // El peso propio de la fundación es UNO SOLO: es el de la platea que recibe los apoyos, no
  // uno por nudo. Entra por nivel, igual que en el modo de un nudo.
  it("Ds del nivel se suma una sola vez, no una por nudo", () => {
    const { cargas } = sumarNudos(ns);
    const r = calcular({
      cargas, hips: ["Ds", "PP"],
      combosU: [{ k: "a", f: { Ds: 1.4, PP: 1.4 } }], combosS: [], h: 1.5, ds: 100,
    });
    expect(r.elu[0].esf.N).toBeCloseTo(1.4 * 30 + 1.4 * 100, 9);
  });

  it("el traslado usa el corte del CONJUNTO, no el de un apoyo", () => {
    const { cargas } = sumarNudos(ns);
    const r = calcular({
      cargas, hips: ["PP"], combosU: [{ k: "a", f: { PP: 1 } }], combosS: [], h: 2,
    });
    // Myy = 1 + 3 = 4 ; Vx = 2 + 4 = 6 → 4 + 6·2 = 16
    expect(r.elu[0].esf.Myy).toBeCloseTo(16, 9);
  });
});
