import { describe, it, expect } from "vitest";
import { trasladarEnPlanta, aporteDePosiciones, posDe, tienePos } from "../src/engine/planta.js";
import { sumarNudos } from "../src/engine/conjunto.js";
import { combinar } from "../src/engine/combinar.js";

// ── EL CASO DE ORO: plataforma con las bases ARTICULADAS ─────────────────────────────
//
// Cuatro columnas en (±2, ±1,5) m, arriostradas con cruces de San Andrés, peso total 200 kN y
// una carga horizontal H = 60 kN aplicada a z = 5 m. Al ser articulaciones, cada nudo entrega
// MOMENTO CERO: el vuelco H·z = 300 kN·m viaja únicamente como par de fuerzas verticales.
//
//   ΔN = H·z / (4a) = 300 / 8 = 37,5 kN
//   lado comprimido  N = 50 + 37,5 = 87,5 kN   ·   lado descargado  N = 50 − 37,5 = 12,5 kN
//
// Sumar sin posiciones da Myy = 0 y el vuelco desaparece entero. Con posiciones da 300 kN·m.
const A = 2, B = 1.5, W = 200, H = 60, Z = 5;
const DN = H * Z / (4 * A);                                  // 37,5 kN
const nudo = (nombre, x, y, N, Vx) => ({
  nombre, pos: { x, y },
  cargas: {
    "Peso propio": { N: W / 4, Vx: 0, Vy: 0, Myy: 0, Mxx: 0, T: 0 },
    "Wx+":         { N, Vx, Vy: 0, Myy: 0, Mxx: 0, T: 0 },     // bases articuladas: Myy = 0
  },
});
const marco = () => [
  nudo("C1", +A, +B, +DN, H / 4), nudo("C2", +A, -B, +DN, H / 4),
  nudo("C3", -A, +B, -DN, H / 4), nudo("C4", -A, -B, -DN, H / 4),
];
const sinPos = () => marco().map(n => ({ ...n, pos: { x: 0, y: 0 } }));

describe("traslado en planta — el vuelco de una estructura articulada", () => {
  it("sin posiciones el conjunto informa vuelco CERO, que es el defecto que esto corrige", () => {
    const r = sumarNudos(sinPos());
    expect(r.cargas["Wx+"].Vx).toBeCloseTo(H, 9);          // el corte sí llega
    expect(r.cargas["Wx+"].N).toBeCloseTo(0, 9);           // los ΔN se cancelan
    expect(r.cargas["Wx+"].Myy).toBeCloseTo(0, 9);         // ← y el vuelco desaparece
  });

  it("con posiciones aparece exactamente H·z", () => {
    const r = sumarNudos(marco());
    expect(r.cargas["Wx+"].Myy).toBeCloseTo(H * Z, 9);     // 300 kN·m
    expect(r.cargas["Wx+"].Vx).toBeCloseTo(H, 9);          // las fuerzas no cambian
    expect(r.cargas["Wx+"].N).toBeCloseTo(0, 9);
    expect(r.conPos).toBe(true);
  });

  it("en la hipótesis de gravedad los aportes se CANCELAN solos", () => {
    // es la razón de que la posición sea geométrica y por nudo, y no una excentricidad global:
    // una excentricidad única habría inventado momento donde la carga está equilibrada
    const r = sumarNudos(marco());
    expect(r.cargas["Peso propio"].N).toBeCloseTo(W, 9);
    expect(r.cargas["Peso propio"].Myy).toBeCloseTo(0, 9);
    expect(r.cargas["Peso propio"].Mxx).toBeCloseTo(0, 9);
  });

  it("el baricentro de las verticales cae del lado comprimido, a H·z/W", () => {
    // la lectura física que hace el usuario: «el baricentro está más cerca de los comprimidos»
    const ns = marco();
    const Ni = ns.map(n => n.cargas["Peso propio"].N + n.cargas["Wx+"].N);
    const xg = Ni.reduce((a, N, k) => a + N * ns[k].pos.x, 0) / Ni.reduce((a, N) => a + N, 0);
    expect(xg).toBeCloseTo(H * Z / W, 9);                  // 1,50 m
    expect(xg).toBeGreaterThan(0);                         // hacia el lado que se comprime
  });
});

describe("traslado en planta — propiedades del operador", () => {
  const esf = { N: 100, Vx: 20, Vy: 30, Myy: 5, Mxx: 7, T: 2 };

  it("posición nula es la identidad", () => {
    expect(trasladarEnPlanta(esf, 0, 0)).toEqual(esf);
  });

  it("las fuerzas no cambian; sólo los tres momentos", () => {
    const r = trasladarEnPlanta(esf, 0.6, -0.4);
    expect([r.N, r.Vx, r.Vy]).toEqual([esf.N, esf.Vx, esf.Vy]);
    expect(r.Myy).toBeCloseTo(5 + 100 * 0.6, 9);
    expect(r.Mxx).toBeCloseTo(7 + 100 * -0.4, 9);
  });

  it("APARECE torsión, al revés que en el traslado en profundidad", () => {
    const r = trasladarEnPlanta(esf, 0.6, -0.4);
    expect(r.T).toBeCloseTo(2 + 30 * 0.6 - 20 * -0.4, 9);
    expect(r.T).not.toBeCloseTo(esf.T, 6);
  });

  it("es lineal: trasladar y combinar da lo mismo que combinar y trasladar", () => {
    // la propiedad que permite meterlo en el pipeline sin reordenar nada
    const cargas = { A: esf, B: { N: -40, Vx: 5, Vy: -8, Myy: 1, Mxx: -2, T: 3 } };
    const f = { A: 1.2, B: 0.9 };
    const x = 0.75, y = -0.5;
    const antes = combinar(
      Object.fromEntries(Object.entries(cargas).map(([h, c]) => [h, trasladarEnPlanta(c, x, y)])), f).esf;
    const despues = trasladarEnPlanta(combinar(cargas, f).esf, x, y);
    for (const k of ["N", "Vx", "Vy", "Myy", "Mxx", "T"])
      expect(antes[k]).toBeCloseTo(despues[k], 9);
  });

  it("el signo importa: dos nudos simétricos se cancelan y no se suman", () => {
    const a = trasladarEnPlanta({ N: 100 }, +1.5, 0);
    const b = trasladarEnPlanta({ N: 100 }, -1.5, 0);
    expect(a.Myy + b.Myy).toBeCloseTo(0, 9);
  });

  it("aporteDePosiciones separa lo que pone la planta de lo que traían los nudos", () => {
    const ap = aporteDePosiciones(marco(), "Wx+");
    expect(ap.Myy).toBeCloseTo(H * Z, 9);
    const r = sumarNudos(marco()), r0 = sumarNudos(sinPos());
    expect(r.cargas["Wx+"].Myy - r0.cargas["Wx+"].Myy).toBeCloseTo(ap.Myy, 9);
  });

  it("posDe y tienePos toleran un nudo sin `pos` (proyecto guardado antes del campo)", () => {
    expect(posDe({})).toEqual({ x: 0, y: 0 });
    expect(tienePos({})).toBe(false);
    expect(tienePos({ pos: { x: 0, y: 0 } })).toBe(false);
    expect(tienePos({ pos: { x: 0.6, y: 0 } })).toBe(true);
  });
});
