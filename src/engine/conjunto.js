// SUMA DE VARIOS NUDOS SOBRE UNA MISMA FUNDACIÓN.
//
// El caso: un sleeper, una platea o una base que recibe VARIOS apoyos a la vez —veinte
// soportes de cañería sobre una platea corrida, los cuatro apoyos de un skid—. Esa fundación
// no ve cada reacción por separado: las ve todas juntas, y lo que hay que equilibrar para la
// estabilidad global es la RESULTANTE del conjunto.
//
// Es la diferencia con el modo de un nudo por vez, que sirve para lo contrario: veinte
// soportes con veinte fundaciones independientes, donde cada nudo es una base y sumarlos no
// significaría nada.
//
// ── LA HIPÓTESIS DE CÁLCULO, dicha de frente ────────────────────────────────────
//
// **SE SUMA COMPONENTE A COMPONENTE, SIN POSICIONES.** Eso equivale a suponer que todas las
// resultantes actúan en el BARICENTRO DE LA FUNDACIÓN, que es el criterio adoptado para esta
// app. Con esa hipótesis desaparecen los términos `N·e` que aportaría la excentricidad de
// cada apoyo respecto del baricentro, y con ellos la necesidad de conocer la posición en
// planta de cada nudo —que la tabla de reacciones de CYPE no trae—.
//
// La consecuencia hay que tenerla presente y la memoria la declara: el momento del conjunto
// es la suma de los momentos de los apoyos, y NO incluye el que genera la distribución de las
// cargas verticales en planta. Para un conjunto razonablemente simétrico —que es el caso de
// un sleeper con soportes repartidos— es el criterio corriente. Para una fundación con las
// cargas verticales netamente descentradas, subestima el vuelco.
//
// ── SE SUMA POR HIPÓTESIS, NO POR COMBINACIÓN ───────────────────────────────────
//
// Primero se suman los veinte `Wx+`, los veinte `Do`, los veinte `Eex`; después se combina.
// Al revés —sumar combinaciones ya armadas— mezclaría casos que no ocurren a la vez y el
// resultado no correspondería a ninguna situación real. Además, siendo las dos operaciones
// lineales, sumar-y-combinar da lo mismo que combinar-y-sumar, y hay un test que lo fija.
import { COMP_KEYS } from '../constants/componentes.js';

const n0 = (v) => (typeof v === "number" && isFinite(v) ? v : 0);
const cero = () => Object.fromEntries(COMP_KEYS.map(k => [k, 0]));

// Suma las cargas de una lista de nudos. Devuelve `{ cargas, hips, avisos, detalle }`.
//
// `detalle` lleva, por hipótesis, qué nudos aportaron y cuáles no. No es información de
// diagnóstico: es lo que permite emitir el aviso de abajo, que es el único control posible
// contra el error más peligroso de esta operación.
export function sumarNudos(nudos) {
  const lista = (nudos || []).filter(Boolean);
  const cargas = {};
  const detalle = {};

  // Todas las hipótesis que aparecen en algún nudo, en el orden en que se las encuentra.
  const hips = [];
  for (const n of lista) {
    for (const h of Object.keys(n.cargas || {})) if (!hips.includes(h)) hips.push(h);
  }

  for (const h of hips) {
    const acum = cero();
    const con = [], sin = [];
    for (const n of lista) {
      const c = n.cargas?.[h];
      if (!c) { sin.push(n.nombre || "(sin nombre)"); continue; }
      con.push(n.nombre || "(sin nombre)");
      for (const k of COMP_KEYS) acum[k] += n0(c[k]);
    }
    cargas[h] = acum;
    detalle[h] = { con, sin };
  }

  const avisos = [];
  if (!lista.length) {
    avisos.push("No hay ningún nudo incluido en el conjunto: todas las combinaciones van a dar cero.");
  }

  // ⚠ EL AVISO QUE JUSTIFICA TODO EL `detalle`.
  //
  // Si tres de veinte nudos no traen `Wx+`, el viento del conjunto sale un 15 % bajo. El
  // número resultante es plausible, no rompe nada y no hay forma de notarlo mirando la tabla:
  // una suma de diecisiete valores no se revisa a ojo. Es exactamente la clase de error que
  // esta app existe para no cometer, así que se dice cuáles faltan y en qué hipótesis.
  const incompletas = hips.filter(h => detalle[h].sin.length);
  for (const h of incompletas) {
    const { con, sin } = detalle[h];
    avisos.push(`«${h}» sólo la traen ${con.length} de ${lista.length} nudos: falta en `
      + `${sin.slice(0, 6).join(", ")}${sin.length > 6 ? ` y ${sin.length - 6} más` : ""}. `
      + `La suma va a salir baja en esa hipótesis, y el total va a parecer correcto igual.`);
  }

  return { cargas, hips, avisos, detalle, nudos: lista.map(n => n.nombre || "(sin nombre)") };
}

// El aporte de cada nudo a UNA hipótesis, para la tabla de trazabilidad de la memoria. Sin
// esto, la resultante del conjunto es un número que no se puede reconstruir: veinte filas
// sumadas y ninguna forma de saber cuál pesó.
export function aportesPorNudo(nudos, hip) {
  return (nudos || []).map(n => ({
    nombre: n.nombre || "(sin nombre)",
    esf: n.cargas?.[hip] ? { ...cero(), ...n.cargas[hip] } : null,
  }));
}

// Total de una componente sobre todas las hipótesis y nudos, para los encabezados de resumen.
export const totalDe = (cargas, hip, comp) => n0(cargas?.[hip]?.[comp]);
