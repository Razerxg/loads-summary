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
// ⚠ `Ds` NO SALE DE LA PLANILLA Y NUNCA VA A SALIR. Es el peso propio de la FUNDACIÓN
// —zapata, pedestal y el suelo que gravita encima— y el modelo de CYPE no lo tiene: el
// modelo termina en el nudo, que es justamente la cara superior de la fundación. Aparece
// recién cuando las cargas se bajan a la cota de desplante, y por eso su valor es una
// propiedad DEL NIVEL y no del nudo: a 0,00 m no hay nada de fundación arriba, y a 1,50 m
// hay todo lo que haya entre esas dos cotas. Se marca con `porNivel` para que la pantalla de
// hipótesis no lo ofrezca como un campo más del nudo, donde no significaría nada.
// La cuarta columna es el nombre CORTO de la acción, y no es un adorno: es lo que se imprime
// en la columna «Acciones» del listado de combinaciones. Con el rótulo largo, una fila como
// `1,2·Ds + 1,2·PP + 1,2·Do + 1,0·L + 0,5·S + 1,0·Wx+` se describía como «Peso propio de la
// fundación + Peso propio (del modelo) + Peso en operación + Sobrecarga de uso + Nieve +
// viento» y estiraba cada fila de la memoria a seis renglones.
//
// Los cuatro vientos comparten «viento» y los cuatro sismos «sismo», a propósito: en la
// descripción en palabras el sentido no aporta —lo aportan las columnas de coeficientes— y
// repetirlo cuatro veces sólo ensucia.
const CAT = [
  ["Ds", "Peso propio de la fundación", "permanente", "peso de fundación", true],
  ["PP", "Peso propio (del modelo)", "permanente", "peso propio"],
  ["De", "Peso en vacío", "permanente", "vacío"],
  ["Do", "Peso en operación", "permanente", "operación"],
  ["Dt", "Peso en prueba hidráulica", "permanente", "prueba hidráulica"],
  ["L", "Sobrecarga de uso", "variable", "sobrecarga"],
  ["S", "Nieve", "variable", "nieve"],
  ["Wx+", "Viento +X", "accidental", "viento"],
  ["Wx-", "Viento −X", "accidental", "viento"],
  ["Wy+", "Viento +Y", "accidental", "viento"],
  ["Wy-", "Viento −Y", "accidental", "viento"],
  ["Eex", "Sismo X (masa en vacío)", "accidental", "sismo"],
  ["Eey", "Sismo Y (masa en vacío)", "accidental", "sismo"],
  ["Eox", "Sismo X (masa en operación)", "accidental", "sismo"],
  ["Eoy", "Sismo Y (masa en operación)", "accidental", "sismo"],
  ["Ts", "Térmica / fricción", "variable", "térmica"],
  ["F1", "Accidental F1 (disparo de PSV)", "accidental", "disparo de PSV"],
  ["F2", "Accidental F2 (disparo de PSV)", "accidental", "disparo de PSV"],
];

export const HIP_CAT = CAT.map(([k, rotulo, familia, corto, porNivel = false]) =>
  ({ k, rotulo, familia, corto, porNivel }));
export const CAT_POR_K = Object.fromEntries(HIP_CAT.map(h => [h.k, h]));

// Clave de la hipótesis cuyo valor lo pone el NIVEL y no el nudo. Hay una sola y por ahora
// alcanza, pero se nombra en vez de escribir "Ds" por todos lados: si mañana hubiera otra
// —el empuje del suelo sobre el pedestal, por ejemplo— el cambio queda acotado.
export const HIP_DS = "Ds";
export const esPorNivel = (k) => !!CAT_POR_K[k]?.porNivel;

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
// Se usa el nombre CORTO del catálogo, no el rótulo largo, y las repeticiones se colapsan:
// los cuatro vientos dicen todos «viento». Una hipótesis que no esté en el catálogo entra
// con su propio nombre, que es lo único que se sabe de ella.
export const comboDescNatural = (f, hips) => {
  const vistas = [];
  for (const k of (hips || Object.keys(f || {}))) {
    if (num(f?.[k], 0) === 0) continue;
    const w = CAT_POR_K[k]?.corto || k;
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
