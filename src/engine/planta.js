// TRASLADO EN PLANTA — referir las cargas de un nudo al eje de la fundación.
//
// EL CASO QUE LO OBLIGA. Una plataforma con cuatro columnas ARTICULADAS en la base,
// arriostrada con cruces de San Andrés, y una carga horizontal arriba. Como las bases son
// articulaciones, cada nudo entrega momento CERO: el vuelco no viaja como momento, viaja como
// PAR DE FUERZAS VERTICALES —dos apoyos que se comprimen más y dos que se descargan—.
//
// Sumar esos cuatro nudos componente a componente da:
//     N = ΣN_i = peso        (los ΔN se cancelan entre sí)
//     Vx = ΣV_i = H
//     Myy = ΣMyy_i = 0       ← y acá se pierde TODO el vuelco
//
// El momento real que la estructura entrega a la fundación es `Σ N_i·x_i = H·z`, y sin las
// posiciones ese término no existe. No es una subestimación menor: en el caso de prueba de los
// tests son 300 kN·m contra 0. La app declaraba la hipótesis —«se considera que las cargas
// actúan en el baricentro de la fundación»— y advertía que subestima el vuelco con cargas
// descentradas; esto es lo que hacía falta para levantar esa limitación.
//
// LA FÓRMULA, con la convención de ejes de la casa (X longitudinal · Y transversal ·
// Z vertical hacia arriba · N positiva en compresión):
//
//     N'  = N        Vx' = Vx        Vy' = Vy
//     Myy' = Myy + N·x
//     Mxx' = Mxx + N·y
//     T'   = T + Vy·x − Vx·y
//
// Los dos primeros son los mismos que usa `bases-v-0.1` en `engine/loads.js`
// (`h.Myy += Myy + N*g.x`), y eso importa: las apps se pasan números y una diferencia de
// criterio acá daría dos memorias distintas del mismo modelo.
//
// EL TORSOR SÍ CAMBIA, al revés que en el traslado en profundidad. Bajar por el eje vertical
// no genera torsión porque el brazo es paralelo al eje del torsor; correr el punto EN PLANTA
// sí, y es el término `(r × F)_z = x·Vy − y·Vx`. Es exactamente el traslado que el encabezado
// de `traslado.js` dice que no hace, y ahora hace.
//
// ⚠ LA POSICIÓN VA CON SIGNO Y ES GEOMÉTRICA, no una excentricidad estimada. Se mide desde el
// EJE DE LA FUNDACIÓN, positiva hacia +X y +Y. Esto es lo que hace que el caso de arriba salga
// solo y bien: en la hipótesis de peso propio los cuatro apoyos traen la misma N y los `N·x`
// se cancelan —momento cero, que es lo correcto—, y en la de viento se desbalancean y aparece
// el `H·z` con su signo. Una excentricidad global única, en cambio, habría inventado momento
// en la hipótesis de gravedad y no habría cambiado de signo entre `Wx+` y `Wx−`.
import { COMP_KEYS } from '../constants/componentes.js';

const n0 = (v) => (typeof v === "number" && isFinite(v) ? v : 0);

export const POS_CERO = { x: 0, y: 0 };
export const posDe = (nudo) => ({ x: n0(nudo?.pos?.x), y: n0(nudo?.pos?.y) });
export const tienePos = (nudo) => {
  const p = posDe(nudo);
  return Math.abs(p.x) > 1e-12 || Math.abs(p.y) > 1e-12;
};

// Traslada UN juego de esfuerzos desde su posición en planta al eje de la fundación.
// `x = y = 0` devuelve una copia igual: el nudo centrado no es un caso especial.
export function trasladarEnPlanta(esf, x, y) {
  const dx = n0(x), dy = n0(y);
  const out = { ...esf };
  if (!dx && !dy) return out;
  const N = n0(esf?.N), Vx = n0(esf?.Vx), Vy = n0(esf?.Vy);
  out.Myy = n0(esf?.Myy) + N * dx;
  out.Mxx = n0(esf?.Mxx) + N * dy;
  out.T   = n0(esf?.T)   + Vy * dx - Vx * dy;
  return out;
}

// Trazabilidad: de dónde sale cada momento trasladado, para poder rehacerlo a mano. Es el
// mismo criterio que `detalleTraslado`: un número sin su cuenta al lado no se puede revisar.
export function detallePlanta(esf, x, y) {
  const dx = n0(x), dy = n0(y);
  const N = n0(esf?.N), Vx = n0(esf?.Vx), Vy = n0(esf?.Vy);
  const t = trasladarEnPlanta(esf, dx, dy);
  return [
    { momento: "Myy", M0: n0(esf?.Myy), terminos: [{ f: "N", v: N, brazo: dx }], M1: n0(t.Myy) },
    { momento: "Mxx", M0: n0(esf?.Mxx), terminos: [{ f: "N", v: N, brazo: dy }], M1: n0(t.Mxx) },
    { momento: "T",   M0: n0(esf?.T),
      terminos: [{ f: "Vy", v: Vy, brazo: dx }, { f: "Vx", v: -Vx, brazo: dy }], M1: n0(t.T) },
  ];
}

// El aporte de las posiciones a UNA hipótesis del conjunto, separado del resto. Sirve para
// contestar la pregunta que se hace quien revisa: «¿cuánto de este momento lo pone la
// distribución en planta y cuánto venía de los nudos?».
export function aporteDePosiciones(nudos, hip) {
  const lista = (nudos || []).filter(Boolean);
  const cero = Object.fromEntries(COMP_KEYS.map(k => [k, 0]));
  const ap = { ...cero };
  for (const n of lista) {
    const c = n.cargas?.[hip];
    if (!c) continue;
    const { x, y } = posDe(n);
    const N = n0(c.N), Vx = n0(c.Vx), Vy = n0(c.Vy);
    ap.Myy += N * x;
    ap.Mxx += N * y;
    ap.T   += Vy * x - Vx * y;
  }
  return ap;
}
