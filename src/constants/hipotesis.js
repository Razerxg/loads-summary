// HIPÓTESIS DE CARGA — catálogo canónico y lista viva del proyecto.
//
// ⚠ LA DIFERENCIA DE FONDO CON `bases-v-0.1`: allá las hipótesis son una CONSTANTE del
// programa (diecisiete, fijas), porque esa app verifica una fundación y necesita saber qué
// significa cada una —cuál es el peso en vacío, cuál la prueba hidráulica— para armar sus
// combinaciones y sus verificaciones geotécnicas.
//
// Acá la app NO INTERPRETA las hipótesis: las resume y las combina con los factores que
// escriba el usuario. Un modelo de CYPE puede traer `V(0°)H1`, `SX`, `Q1` o el nombre que
// haya puesto el proyectista, y rechazarlos por no estar en una lista sería inutilizar la
// app para todo modelo que no sea el del ejemplo. Así que:
//
//   · el CATÁLOGO de abajo es el punto de partida y trae los nombres de uso corriente, con
//     su rótulo en palabras y sus alias de importación;
//   · la lista VIVA es estado del proyecto y el importador puede AGREGARLE lo que encuentre
//     en la planilla;
//   · lo que no esté en el catálogo entra igual, con su nombre tal cual vino.
//
// EL «PESO PROPIO» DE CYPE ES UNA HIPÓTESIS DE PLENO DERECHO, no algo a repartir. En bases
// se sumaba a De, Do y Dt, porque allá esas tres son PESOS TOTALES por estado y el peso
// propio está presente en los tres. Acá no hay ningún estado que interpretar: si el modelo
// entregó una hipótesis «Peso propio», el usuario decide con qué factor entra en cada
// combinación, que es exactamente lo que hace CYPE. Repartirla sola le cambiaría los
// números sin que lo pidiera, y encima al revés de lo que su propio modelo dice.
import { num } from '../engine/utils.js';

// [clave, rótulo, familia]. La FAMILIA es lo único que la app usa para algo: marca las
// acciones ACCIDENTALES (viento, sismo, accidentales), que se señalan en el listado de
// combinaciones porque suelen llevar otro criterio de admisibles aguas abajo.
const CAT = [
  ["PP", "Peso propio (del modelo)", "permanente"],
  ["De", "Peso en vacío", "permanente"],
  ["Do", "Peso en operación", "permanente"],
  ["Dt", "Peso en prueba hidráulica", "permanente"],
  ["L", "Sobrecarga de uso", "variable"],
  ["S", "Nieve", "variable"],
  ["Wx+", "Viento +X", "accidental"],
  ["Wx-", "Viento −X", "accidental"],
  ["Wy+", "Viento +Y", "accidental"],
  ["Wy-", "Viento −Y", "accidental"],
  ["Eex", "Sismo X (masa en vacío)", "accidental"],
  ["Eey", "Sismo Y (masa en vacío)", "accidental"],
  ["Eox", "Sismo X (masa en operación)", "accidental"],
  ["Eoy", "Sismo Y (masa en operación)", "accidental"],
  ["Ts", "Térmica / fricción", "variable"],
  ["F1", "Accidental F1 (disparo de PSV)", "accidental"],
  ["F2", "Accidental F2 (disparo de PSV)", "accidental"],
];

export const HIP_CAT = CAT.map(([k, rotulo, familia]) => ({ k, rotulo, familia }));
export const CAT_POR_K = Object.fromEntries(HIP_CAT.map(h => [h.k, h]));

// Las que arrancan activas. Es el juego que trae un modelo de proceso típico; el resto se
// agrega solo al importar, y las que sobran se borran de a una.
export const HIPS_DEF = HIP_CAT.map(h => h.k);

export const VIENTOS = ["Wx+", "Wx-", "Wy+", "Wy-"];
export const SISMOS = ["Eex", "Eey", "Eox", "Eoy"];
export const PSV = ["F1", "F2"];

// El rótulo de una hipótesis cualquiera: del catálogo si está, y si no su propio nombre.
// Nunca devuelve vacío — una columna sin encabezado es una columna que no se puede leer.
export const rotuloHip = (k) => CAT_POR_K[k]?.rotulo || String(k || "—");
export const familiaHip = (k) => CAT_POR_K[k]?.familia || "otra";

// ¿La combinación mete alguna acción accidental? Se marca en el listado con una ᴬ.
// Una hipótesis FUERA del catálogo nunca cuenta como accidental: la app no tiene forma de
// saber qué es `Q1`, y suponerlo sería marcar combinaciones al azar.
export const esAccidental = (f) => Object.keys(f || {})
  .some(k => familiaHip(k) === "accidental" && num(f[k], 0) !== 0);

// Expresión legible: "1,20·Do + 1,00·Wx+". El orden es el de la lista viva que se pase,
// para que la descripción siga el mismo orden que las columnas de la matriz.
export const comboDesc = (f, hips) => (hips || Object.keys(f || {}))
  .filter(k => num(f?.[k], 0) !== 0)
  .map(k => `${num(f[k], 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}·${k}`)
  .join(" + ") || "—";

// Descripción en palabras, sin repetir: "operación + viento". Sirve para la columna
// «Descripción» del listado, donde la expresión con factores es demasiado larga.
export const comboDescNatural = (f, hips) => {
  const vistas = [];
  for (const k of (hips || Object.keys(f || {}))) {
    if (num(f?.[k], 0) === 0) continue;
    // Los cuatro vientos dicen todos «viento», y los cuatro sismos «sismo»: en la
    // descripción en palabras el sentido no aporta, lo aporta la expresión con factores.
    const w = VIENTOS.includes(k) ? "viento" : SISMOS.includes(k) ? "sismo" : rotuloHip(k);
    if (!vistas.includes(w)) vistas.push(w);
  }
  return vistas.length ? vistas.join(" + ") : "—";
};

// ── LISTA VIVA ────────────────────────────────────────────────────────────────────
// Agrega al final las hipótesis que no estaban, conservando el orden de las que ya había:
// reordenar la lista al importar movería todas las columnas de la matriz de combinaciones
// que el usuario ya tiene escrita, y los factores quedarían debajo de otra hipótesis.
export function agregarHips(hips, nuevas) {
  const out = [...hips];
  const puestas = [];
  for (const k of nuevas || []) {
    if (!k || out.includes(k)) continue;
    out.push(k);
    puestas.push(k);
  }
  return { hips: out, puestas };
}

// Quitar una hipótesis tiene que limpiar TAMBIÉN su factor en cada combinación. Sin esto,
// el factor quedaba escondido en el objeto: la columna desaparecía de la pantalla pero la
// hipótesis seguía sumando al total, que es la peor forma de equivocarse —invisible—.
export function quitarHip(k, { hips, combosU, combosS }) {
  const limpiar = (cs) => cs.map(c => {
    const f = { ...c.f };
    delete f[k];
    return { ...c, f };
  });
  return { hips: hips.filter(h => h !== k), combosU: limpiar(combosU), combosS: limpiar(combosS) };
}
