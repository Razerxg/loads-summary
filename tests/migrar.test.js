import { describe, it, expect } from 'vitest';
import { migrarProyecto } from '../src/engine/migrar.js';
import { HIPS_DEF } from '../src/constants/hipotesis.js';
import { DEF_ELU, mkCombo } from '../src/constants/combosDef.js';
import { calcular } from '../src/engine/combinar.js';

const opts = { ordenCatalogo: HIPS_DEF };
// Un proyecto tal como quedaba guardado ANTES de que existiera `Ds`.
const VIEJO = () => ({
  hips: ["PP", "De", "Do", "L", "Wx+"],
  combosU: [mkCombo({ PP: 1.4, De: 1.4 }), mkCombo({ PP: 0.9, De: 0.9, "Wx+": 1 })],
  combosS: [mkCombo({ PP: 1, Do: 1 })],
});

describe("migración de un proyecto sin Ds", () => {
  // ⚠ EL MODO DE FALLA COMPLETO, en un test.
  //
  // Sin la columna `φDs`, el peso propio de fundación que el usuario carga en Niveles se
  // multiplica por cero: el campo se ve lleno y el total no se mueve. No hay error, no hay
  // aviso, y la única señal es rehacer la cuenta a mano.
  it("sin migrar, el Ds cargado NO entra en el total", () => {
    const v = VIEJO();
    const r = calcular({
      cargas: { PP: { N: 10, Vx: 0, Vy: 0, Myy: 0, Mxx: 0, T: 0 } },
      hips: v.hips, combosU: v.combosU, combosS: [], h: 0, ds: 200,
    });
    expect(r.elu[0].esf.N).toBeCloseTo(1.4 * 10, 9);      // los 200 kN no aparecen
  });

  it("migrado, el mismo proyecto sí lo suma", () => {
    const { estado } = migrarProyecto(VIEJO(), opts);
    const r = calcular({
      cargas: { PP: { N: 10, Vx: 0, Vy: 0, Myy: 0, Mxx: 0, T: 0 } },
      hips: estado.hips, combosU: estado.combosU, combosS: [], h: 0, ds: 200,
    });
    expect(r.elu[0].esf.N).toBeCloseTo(1.4 * 10 + 1.4 * 200, 9);
  });

  it("agrega Ds a la lista de hipótesis", () => {
    const { estado, cambios } = migrarProyecto(VIEJO(), opts);
    expect(estado.hips).toContain("Ds");
    expect(cambios.enLista).toBe(true);
  });

  // Va al lado de los otros permanentes y no al final, porque los factores se guardan POR
  // NOMBRE: el orden es puramente visual y así un proyecto viejo se lee igual que uno nuevo.
  it("lo inserta en el orden del catálogo, antes de PP", () => {
    const { estado } = migrarProyecto(VIEJO(), opts);
    expect(estado.hips.indexOf("Ds")).toBeLessThan(estado.hips.indexOf("PP"));
  });

  it("copia el factor de PP en cada combinación", () => {
    const { estado, cambios } = migrarProyecto(VIEJO(), opts);
    expect(estado.combosU[0].f.Ds).toBe(1.4);
    expect(estado.combosU[1].f.Ds).toBe(0.9);              // levantamiento: queda minorado
    expect(estado.combosS[0].f.Ds).toBe(1);
    expect(cambios.combos).toBe(3);
  });

  // Sin un permanente de referencia no hay de dónde deducir el coeficiente. Poner 1,0 —o
  // 1,4— sería elegir por el usuario un número que cambia el resultado.
  it("NO inventa el factor si la combinación no tiene PP", () => {
    const v = { hips: ["Do"], combosU: [mkCombo({ Do: 1.4 })], combosS: [] };
    const { estado, cambios } = migrarProyecto(v, opts);
    expect(estado.combosU[0].f.Ds).toBeUndefined();
    expect(cambios.sinRef).toEqual(["ELU1"]);
  });

  it("no toca las combinaciones que ya tienen Ds", () => {
    const v = { hips: ["Ds", "PP"], combosU: [mkCombo({ Ds: 0.6, PP: 1.4 })], combosS: [] };
    const { estado } = migrarProyecto(v, opts);
    expect(estado.combosU[0].f.Ds).toBe(0.6);              // se respeta el del usuario
  });

  // Un proyecto ya al día no se toca en absoluto, y `cambios` es null para que la pantalla no
  // muestre un aviso de algo que no pasó.
  it("un proyecto nuevo no se migra", () => {
    const v = { hips: [...HIPS_DEF], combosU: DEF_ELU.map(f => mkCombo({ ...f })), combosS: [] };
    const { estado, cambios } = migrarProyecto(v, opts);
    expect(cambios).toBeNull();
    expect(estado).toBe(v);                               // ni siquiera se clona
  });

  it("no rompe con un objeto ilegible", () => {
    expect(migrarProyecto(null, opts).cambios).toBeNull();
    expect(migrarProyecto({}, opts).estado).toBeTruthy();
  });

  it("es idempotente: migrar dos veces no duplica ni cambia nada", () => {
    const a = migrarProyecto(VIEJO(), opts);
    const b = migrarProyecto(a.estado, opts);
    expect(b.cambios).toBeNull();
    expect(b.estado.hips).toEqual(a.estado.hips);
  });

  // Se informa SIEMPRE lo que se tocó: esto modifica la matriz del usuario, y una migración
  // muda es un cambio de números sin autor.
  it("devuelve el parte de lo que cambió", () => {
    const { cambios } = migrarProyecto(VIEJO(), opts);
    expect(cambios).toMatchObject({ hip: "Ds", enLista: true, combos: 3, sinRef: [] });
    expect(cambios.rotulo).toMatch(/fundaci/i);
  });
});
