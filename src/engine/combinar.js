// COMBINAR LAS HIPÓTESIS Y ARMAR LAS TABLAS.
//
// Todo el cálculo de esta app es esto: una suma ponderada por combinación, y el traslado en
// profundidad de arriba. No hay verificación de nada —ni tensiones, ni vuelco, ni armadura—;
// eso vive en `bases-v-0.1` y en `soporte-elevado-v4`, que consumen justamente estos
// números. Acá se resume lo que entregó el modelo y se lo lleva a donde hace falta.
//
// ── EL ORDEN DE LAS DOS OPERACIONES, que parece un detalle y no lo es ───────────────
//
// Se COMBINA PRIMERO y se TRASLADA DESPUÉS. Con el criterio con signo da exactamente lo
// mismo hacerlo al revés, porque las dos operaciones son lineales:
//
//     Σᵢ φᵢ·(Mᵢ + Vᵢ·h)  =  Σᵢ φᵢ·Mᵢ  +  h·Σᵢ φᵢ·Vᵢ
//
// —hay un test que lo fija, porque es la clase de identidad que un refactor rompe sin que
// nada falle—. Pero con el criterio ENVOLVENTE (`|M| + |V|·h`) NO da lo mismo: trasladar
// hipótesis por hipótesis y después sumar los valores absolutos da un número mucho mayor,
// que suma como desfavorables cosas que en la combinación real se cancelan.
//
// Combinar primero es lo correcto: la envolvente conservadora se aplica sobre la
// SOLICITACIÓN REAL de la combinación, no sobre cada pedazo por separado.
import { COMP_KEYS } from '../constants/componentes.js';
import { esAccidental, comboDesc, comboDescNatural, HIP_DS } from '../constants/hipotesis.js';
import { trasladar, MODO_DEF } from './traslado.js';

const n0 = (v) => (typeof v === "number" && isFinite(v) ? v : 0);

// ── EL PESO PROPIO DE LA FUNDACIÓN ──────────────────────────────────────────────
//
// `Ds` no viene de la planilla y nunca va a venir: el modelo de CYPE termina en el nudo, que
// es la cara superior de la fundación. Aparece recién al bajar a la cota de desplante, y su
// valor depende DEL NIVEL —a 0,00 m no hay nada de fundación arriba—, así que se inyecta
// como una carga más del nivel y de ahí en adelante el pipeline no lo distingue del resto.
//
// ES UNA FUERZA VERTICAL PURA, sin cortes ni momentos:
//  · el signo es POSITIVO porque `N` es positiva en compresión sobre el apoyo, y el peso de
//    la fundación comprime;
//  · **no genera momento**, lo que supone que su resultante pasa por el mismo punto en que
//    se están midiendo los esfuerzos. Es lo correcto para una zapata simétrica bajo el
//    pedestal, que es el caso normal. Una fundación excéntrica agregaría `N·e` y eso esta
//    app no lo modela; está dicho en la pantalla de Niveles.
//
// Como no tiene corte, trasladarlo es una operación nula: `M + V·h` con `V = 0` deja el
// momento igual. Por eso puede entrar antes del traslado sin ningún caso especial, y por eso
// da lo mismo dónde se inyecte. Es lo que hace que no haga falta un camino aparte.
export const cargaDs = (ds) => ({ ...Object.fromEntries(COMP_KEYS.map(k => [k, 0])), N: n0(ds) });

// Las cargas del nudo más el `Ds` del nivel. Con `ds = 0` NO se agrega la clave: así el nivel
// de referencia no arrastra una hipótesis en cero que después habría que explicar en cada
// tabla, y `combinar` puede distinguir «no corresponde» de «vale cero».
export const cargasEnNivel = (cargas, ds) =>
  n0(ds) !== 0 ? { ...cargas, [HIP_DS]: cargaDs(ds) } : { ...cargas };

// ── SUMA PONDERADA ──────────────────────────────────────────────────────────────
//
// `cargas` es `{ [hip]: { N, Vx, Vy, Myy, Mxx, T } }` y `f` es `{ [hip]: factor }`.
//
// UNA HIPÓTESIS CON FACTOR PERO SIN CARGAS NO SE IGNORA EN SILENCIO. Es el error más fácil
// de cometer —se arma la matriz de combinaciones antes de importar, o se importa una
// planilla a la que le falta una hipótesis— y el resultado tiene la pinta exacta de un
// cálculo correcto: una combinación que debía llevar viento sale sin viento y da bien.
// Por eso se devuelven las faltantes junto con el total.
export function combinar(cargas, f) {
  const esf = Object.fromEntries(COMP_KEYS.map(k => [k, 0]));
  const faltan = [];
  for (const [hip, fac] of Object.entries(f || {})) {
    const φ = n0(fac);
    if (!φ) continue;                                // factor cero = la hipótesis no participa
    const c = cargas?.[hip];
    if (!c || !COMP_KEYS.some(k => n0(c[k]) !== 0)) { faltan.push(hip); continue; }
    for (const k of COMP_KEYS) esf[k] += φ * n0(c[k]);
  }
  return { esf, faltan };
}

// ── TABLA DE UNA LISTA DE COMBINACIONES, A UN NIVEL ─────────────────────────────
//
// Devuelve una fila por combinación con:
//   · `esf`   los esfuerzos EN EL NIVEL pedido (ya trasladados);
//   · `esf0`  los mismos en el nudo, sin trasladar, para poder mostrar el antes y el después;
//   · `faltan` las hipótesis con factor que no tenían cargas.
export function tablaCombos({ cargas, combos, pref = "C", h = 0, modo = MODO_DEF, hips = null }) {
  return (combos || []).map((c, i) => {
    const f = c.f ?? c;
    const { esf, faltan } = combinar(cargas, f);
    return {
      k: c.k ?? `${pref}${i + 1}`,
      nombre: `${pref}${i + 1}`,
      f,
      esf0: esf,
      esf: trasladar(esf, h, modo),
      faltan,
      accidental: esAccidental(f),
      expr: comboDesc(f, hips),
      desc: comboDescNatural(f, hips),
      vacia: !Object.values(f || {}).some(v => n0(v) !== 0),
    };
  });
}

// ── ENVOLVENTE ──────────────────────────────────────────────────────────────────
//
// El máximo y el mínimo de cada componente sobre todas las combinaciones, CON EL NOMBRE DE
// LA QUE LO PRODUCE. El nombre es la mitad del valor: un `Myy` máximo de 84 kN·m no sirve
// para nada si hay que recorrer treinta filas para encontrar de cuál combinación salió.
//
// Se toman el máximo y el mínimo por separado y no el mayor en valor absoluto: en una
// fundación el `N` mínimo es el caso de levantamiento y el máximo el de presión de
// contacto, y son dos verificaciones distintas. Colapsarlos en «el más grande» pierde una.
export function envolvente(filas) {
  const out = {};
  for (const k of COMP_KEYS) {
    let max = null, min = null;
    for (const f of filas || []) {
      const v = n0(f.esf?.[k]);
      if (max === null || v > max.v) max = { v, en: f.nombre };
      if (min === null || v < min.v) min = { v, en: f.nombre };
    }
    out[k] = { max: max ?? { v: 0, en: "—" }, min: min ?? { v: 0, en: "—" } };
  }
  return out;
}

// ── RESUMEN POR HIPÓTESIS ───────────────────────────────────────────────────────
//
// La primera tabla que pide el usuario: una fila por hipótesis, con las seis componentes
// tal como vinieron. Se arma desde la LISTA VIVA y no desde las claves de `cargas`, para
// que una hipótesis declarada y todavía sin datos aparezca —vacía— en vez de desaparecer:
// una fila en blanco se ve, una fila ausente no.
export function tablaHipotesis({ cargas, hips, h = 0, modo = MODO_DEF }) {
  return (hips || []).map(hip => {
    const c = cargas?.[hip] || {};
    const esf0 = Object.fromEntries(COMP_KEYS.map(k => [k, n0(c[k])]));
    return {
      k: hip, hip,
      esf0,
      esf: trasladar(esf0, h, modo),
      // «Sin datos» no es lo mismo que «todo cero»: la primera hay que completarla y la
      // segunda es un resultado legítimo del modelo. Se distinguen por si la clave existe.
      sinDatos: !cargas?.[hip],
      cero: COMP_KEYS.every(k => n0(c[k]) === 0),
    };
  });
}

// ── TODO JUNTO ──────────────────────────────────────────────────────────────────
//
// Un solo punto de entrada para la pantalla de resultados: para un nudo y un nivel,
// devuelve las tres tablas y la envolvente de cada set. Tenerlo acá y no en el componente
// es lo que permite probarlo sin montar React.
export function calcular({ cargas, hips, combosU, combosS, h = 0, modo = MODO_DEF, ds = 0 }) {
  const cargasN = cargasEnNivel(cargas, ds);
  const hipotesis = tablaHipotesis({ cargas: cargasN, hips, h, modo });
  const elu = tablaCombos({ cargas: cargasN, combos: combosU, pref: "ELU", h, modo, hips });
  const els = tablaCombos({ cargas: cargasN, combos: combosS, pref: "ELS", h, modo, hips });

  // `Ds` sale del aviso genérico de «hipótesis con factor pero sin cargas»: en el nivel de
  // referencia vale cero POR DEFINICIÓN —no hay fundación arriba del nudo— y ahí el aviso
  // sería ruido en todas las combinaciones. Lo que sí hay que decir es lo contrario: un
  // nivel EN PROFUNDIDAD cuyas combinaciones usan `Ds` y que no tiene el peso cargado. Ése es
  // un olvido real, y da un total menor y perfectamente plausible.
  const usaDs = [...combosU, ...combosS].some(c => n0((c.f ?? c)?.[HIP_DS]) !== 0);
  // Se limpia el `faltan` de CADA FILA y no sólo el agregado. La primera versión filtraba
  // únicamente la lista de arriba, así que el aviso general desaparecía pero cada combinación
  // seguía mostrando su ⚠: en el nivel de referencia —donde `Ds` vale cero por definición—
  // salían marcadas las cuarenta y ocho, y un aviso que aparece siempre deja de leerse. El
  // día que uno sea de verdad, ya nadie lo mira.
  const limpiar = (fs) => fs.map(f => (f.faltan.includes(HIP_DS)
    ? { ...f, faltan: f.faltan.filter(k => k !== HIP_DS) } : f));
  const eluL = limpiar(elu), elsL = limpiar(els);
  const faltantes = [...new Set([...eluL, ...elsL].flatMap(f => f.faltan))];

  return {
    hipotesis, elu: eluL, els: elsL, ds: n0(ds),
    envELU: envolvente(eluL), envELS: envolvente(elsL),
    // Los avisos se calculan UNA vez acá y no en cada tabla: son del cálculo entero.
    faltantes,
    vacias: [...eluL, ...elsL].filter(f => f.vacia).map(f => f.nombre),
    sinDs: usaDs && n0(h) !== 0 && n0(ds) === 0,
    usaDs,
  };
}
