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
// Se suma COMPONENTE A COMPONENTE. Con las posiciones en cero eso equivale a suponer que todas
// las resultantes actúan en el BARICENTRO DE LA FUNDACIÓN, que fue el criterio original de la
// app: desaparecen los términos `N·x` de la excentricidad de cada apoyo, y con ellos la
// necesidad de conocer la posición en planta de cada nudo —que la tabla de CYPE no trae—.
//
// ES EL DEFAULT Y SIGUE SIENDO VÁLIDO PARA UN CONJUNTO SIMÉTRICO. Pero tiene un caso donde no
// subestima un poco sino que pierde el vuelco ENTERO: una estructura con las bases ARTICULADAS
// —una plataforma con columnas arriostradas por cruces de San Andrés, por ejemplo—. Ahí cada
// nudo entrega momento cero por definición y el vuelco viaja como PAR DE FUERZAS VERTICALES:
// dos apoyos que se comprimen y dos que se descargan. Al sumar sin posiciones, los ΔN se
// cancelan, los momentos son todos cero y el conjunto informa vuelco nulo cuando en realidad
// vale `H·z`.
//
// Por eso cada nudo puede llevar su POSICIÓN EN PLANTA (`pos.x`, `pos.y`, con signo, medida
// desde el eje de la fundación). Si se carga, la suma incorpora `Myy += N·x`, `Mxx += N·y` y
// `T += Vy·x − Vx·y` ANTES de acumular — ver `engine/planta.js`—. Si no se carga, el resultado
// es idéntico al de siempre, así que ningún proyecto guardado cambia de números.
//
// La posición se aplica POR HIPÓTESIS, que es lo que hace que el caso salga bien solo: en peso
// propio los cuatro apoyos traen la misma N y los `N·x` se cancelan (momento cero, correcto),
// y en viento se desbalancean y aparece el vuelco con su signo.
//
// ── SE SUMA POR HIPÓTESIS, NO POR COMBINACIÓN ───────────────────────────────────
//
// Primero se suman los veinte `Wx+`, los veinte `Do`, los veinte `Eex`; después se combina.
// Al revés —sumar combinaciones ya armadas— mezclaría casos que no ocurren a la vez y el
// resultado no correspondería a ninguna situación real. Además, siendo las dos operaciones
// lineales, sumar-y-combinar da lo mismo que combinar-y-sumar, y hay un test que lo fija.
import { COMP_KEYS } from '../constants/componentes.js';
import { trasladarEnPlanta, posDe, tienePos } from './planta.js';

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
      // primero se refiere el nudo al eje de la fundación, después se acumula: con posiciones
      // en cero es la identidad, así que el camino es uno solo y no hay rama que mantener
      const { x, y } = posDe(n);
      const cp = trasladarEnPlanta(c, x, y);
      for (const k of COMP_KEYS) acum[k] += n0(cp[k]);
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

  return { cargas, hips, avisos, detalle, conPos: lista.some(tienePos),
    nudos: lista.map(n => n.nombre || "(sin nombre)") };
}

// El aporte de cada nudo a UNA hipótesis, para la tabla de trazabilidad de la memoria. Sin
// esto, la resultante del conjunto es un número que no se puede reconstruir: veinte filas
// sumadas y ninguna forma de saber cuál pesó.
export function aportesPorNudo(nudos, hip) {
  return (nudos || []).map(n => {
    const { x, y } = posDe(n);
    const base = n.cargas?.[hip] ? { ...cero(), ...n.cargas[hip] } : null;
    return {
      nombre: n.nombre || "(sin nombre)", pos: { x, y },
      esf: base,                                        // como lo entregó el modelo, en el nudo
      esfEje: base ? trasladarEnPlanta(base, x, y) : null,   // ya referido al eje de la fundación
    };
  });
}

// Total de una componente sobre todas las hipótesis y nudos, para los encabezados de resumen.
export const totalDe = (cargas, hip, comp) => n0(cargas?.[hip]?.[comp]);
