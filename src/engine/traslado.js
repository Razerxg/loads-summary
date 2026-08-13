// TRASLADO DE LOS ESFUERZOS A UNA PROFUNDIDAD.
//
// El caso: el modelo entrega la reacción en el NUDO —la cara superior de la fundación, el
// tope del pedestal, el nivel de placa base— y el que dimensiona necesita esos mismos
// esfuerzos abajo: en el fondo de la zapata, a la cota de desplante, en el arranque del
// pilote. Bajar `h` metros no cambia las fuerzas, pero SÍ los momentos: el corte, actuando
// con un brazo `h`, agrega `V·h`.
//
//     N'   = N            Vx'  = Vx           Vy'  = Vy
//     Myy' = Myy + Vx·h   Mxx' = Mxx + Vy·h   T'   = T
//
// ⚠ EL TORSOR NO CAMBIA, y no es un olvido. Trasladar un punto A LO LARGO DEL EJE VERTICAL
// no genera torsión: el brazo `h` es paralelo al eje del torsor, y el producto vectorial de
// dos vectores paralelos es cero. Las fuerzas horizontales generan momento de VUELCO al
// bajar, no de torsión. Torsión aparecería si el punto se corriera en planta —una
// excentricidad `e_x`, `e_y`—, que es otro traslado y no el que hace esta app.
//
// ── EL CRITERIO DE SIGNOS, que es la decisión de fondo ──────────────────────────────
//
// La suma se hace COMPONENTE A COMPONENTE Y CON SIGNO: `M + V·h`, sin valores absolutos y
// sin invertir nada. Es el mismo criterio con el que trabajan `bases-v-0.1` y
// `soporte-elevado-v4` (`M_NF = M_pb + V·h_tr`), y la razón de mantenerlo es que estas tres
// apps se pasan números entre sí: si una sumara y la otra restara, el mismo modelo daría
// dos memorias distintas y nadie sabría cuál mirar.
//
// Esto supone que `Myy` y `Vx` vienen con signos COHERENTES ENTRE SÍ, que es lo que pasa
// cuando los dos salen del mismo modelo y del mismo sistema global —el caso normal al
// importar de CYPE—. Bajo esa hipótesis el traslado con signo es el correcto y el único que
// da el valor real en la cota de destino.
//
// PERO puede no cumplirse: si la planilla se armó a mano mezclando fuentes, o si alguien
// invirtió el signo de una columna al copiarla, `M + V·h` puede RESTAR y devolver un
// momento MENOR que el de arriba. Eso no es conservador y no se distingue a ojo de un caso
// legítimo en que el corte descarga el momento. Por eso existe el segundo modo:
//
//   · `signado`     — `M + V·h`. El valor real bajo la convención del modelo. POR DEFECTO.
//   · `envolvente`  — `|M| + |V|·h`, con el signo de `M` de vuelta al final. Siempre crece,
//                     nunca subestima, y es la salida cuando los signos no son de fiar.
//
// El modo se elige en la pantalla y la tabla dice con cuál está calculada: un número de
// traslado sin su criterio al lado no se puede revisar.
import { PAR_TRASLADO } from '../constants/componentes.js';

export const MODOS = {
  signado: {
    label: "Con signo (M + V·h)",
    corto: "con signo",
    desc: "El traslado real bajo la convención de signos del modelo. Es el criterio de "
      + "bases y de soporte-elevado, y el que corresponde cuando momentos y cortes salen "
      + "del mismo análisis. Si los signos son coherentes, es el valor exacto en la cota.",
  },
  envolvente: {
    label: "Envolvente conservadora (|M| + |V|·h)",
    corto: "envolvente",
    desc: "Suma las magnitudes, así que el momento SIEMPRE crece al bajar. No es el valor "
      + "real: es una cota superior. Usalo cuando los signos de la planilla no sean de fiar "
      + "—columnas copiadas de fuentes distintas, o un modelo con otra convención de ejes—.",
  },
};
export const MODO_DEF = "signado";

const n0 = (v) => (typeof v === "number" && isFinite(v) ? v : 0);

// Traslada UN juego de esfuerzos `h` metros hacia abajo. `h = 0` devuelve una copia igual:
// es el nivel de referencia y tiene que poder pedirse sin caso especial en el llamador.
export function trasladar(esf, h, modo = MODO_DEF) {
  const d = n0(h);
  const out = { ...esf };
  if (!d) return out;
  for (const [m, v] of Object.entries(PAR_TRASLADO)) {
    const M = n0(esf?.[m]), V = n0(esf?.[v]);
    if (modo === "envolvente") {
      // El signo de M se conserva para que la tabla no cambie de signo al bajar de nivel
      // —una columna que salta de + a − se lee como un error—; lo que crece es la magnitud.
      const s = M < 0 ? -1 : 1;
      out[m] = s * (Math.abs(M) + Math.abs(V) * d);
    } else {
      out[m] = M + V * d;
    }
  }
  return out;
}

// El brazo con el que se trasladó cada momento, para poder mostrarlo en la trazabilidad:
// «Myy 12,40 + Vx 3,10 × 1,50 = 17,05». Sin esto, el número de la tabla de destino no se
// puede reconstruir a mano, que es lo primero que hace quien revisa.
export function detalleTraslado(esf, h, modo = MODO_DEF) {
  const d = n0(h);
  return Object.entries(PAR_TRASLADO).map(([m, v]) => ({
    momento: m, corte: v, h: d,
    M0: n0(esf?.[m]), V: n0(esf?.[v]),
    aporte: modo === "envolvente" ? Math.abs(n0(esf?.[v])) * d : n0(esf?.[v]) * d,
    M1: n0(trasladar(esf, d, modo)[m]),
  }));
}

// ── NIVELES ─────────────────────────────────────────────────────────────────────
//
// La app no maneja UNA profundidad sino una LISTA: en una fundación real hacen falta los
// esfuerzos en la cara superior (el nudo), en el fondo de la zapata y a veces en un nivel
// intermedio, y pedirle al usuario que cambie un campo y vuelva a mirar la tabla es
// obligarlo a comparar de memoria.
//
// El nivel de referencia (`h = 0`) EXISTE SIEMPRE y no se puede borrar: es el nudo tal como
// lo entregó el modelo, y es contra lo que se compara todo lo demás.
export const NIVEL_REF = { id: "ref", nombre: "Nudo (nivel del modelo)", h: 0, fijo: true };

let seqNivel = 0;
export const mkNivel = (nombre = "", h = 1) =>
  ({ id: `nv${++seqNivel}${Math.random().toString(36).slice(2, 6)}`, nombre, h, fijo: false });

// Los niveles ordenados y con el de referencia adelante. Se ordena por profundidad para que
// la pantalla lea de arriba hacia abajo como el terreno: el nudo primero y lo más profundo
// al final.
export function nivelesOrdenados(niveles) {
  const extra = (niveles || []).filter(n => n && !n.fijo)
    .sort((a, b) => n0(a.h) - n0(b.h));
  return [NIVEL_REF, ...extra];
}

export const rotuloNivel = (nv) => nv?.fijo
  ? nv.nombre
  : `${nv?.nombre || "Nivel"} — ${n0(nv?.h).toLocaleString("es-AR", { minimumFractionDigits: 2 })} m`;
