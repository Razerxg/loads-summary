// MIGRACIÓN DE PROYECTOS GUARDADOS ANTES DE QUE EXISTIERA UNA HIPÓTESIS.
//
// ── EL PROBLEMA QUE ESTE MÓDULO EXISTE PARA ARREGLAR ────────────────────────────
//
// La app autoguarda en `localStorage` y permite abrir un `.reacciones.json`. Los dos traen
// la lista de hipótesis y las dos matrices de combinación TAL COMO ESTABAN, y eso es lo
// correcto: son del usuario, no del programa, y pisarlas con los valores por defecto le
// borraría el criterio que armó.
//
// Pero cuando el programa AGREGA una hipótesis al catálogo —`Ds`, el peso propio de la
// fundación— un proyecto viejo se queda sin ella: no tiene la columna en la matriz y no
// tiene el factor. El usuario carga el peso de la platea en Niveles, ve el campo lleno, y el
// número no cambia en ninguna tabla. **Multiplicado por cero, en silencio.**
//
// No falla nada. No hay error. La única señal es que el total no se mueve, y eso hay que
// notarlo comparando contra una cuenta hecha a mano. Es exactamente la clase de error que
// esta app existe para no cometer, y se cometió acá.
//
// ── QUÉ HACE Y POR QUÉ ASÍ ──────────────────────────────────────────────────────
//
//  1. **La hipótesis se agrega a la lista**, o no tendría columna donde verse ni editarse.
//     `Ds` va AL PRINCIPIO y no al final —la regla general es agregar al final, para no mover
//     las columnas que el usuario ya tiene escritas— porque acá no hay nada que mover: los
//     factores se guardan POR NOMBRE, no por posición, así que el orden es puramente visual.
//     Y visualmente corresponde al lado de los otros pesos permanentes, que es donde está en
//     un proyecto nuevo. Dos proyectos con la misma matriz tienen que leerse igual.
//
//  2. **El factor se copia del de `PP`.** `Ds` es una carga permanente más: lleva el mismo
//     coeficiente que el resto de los permanentes de esa combinación, 1,4 donde va 1,4 y 0,9
//     en las de levantamiento —donde minorarla es lo conservador—. Es exactamente la regla
//     con la que se arman los sets por defecto (`conDs`), aplicada a una matriz existente.
//
//  3. **Si una combinación no tiene `PP`, NO SE INVENTA NADA.** Sin un permanente de
//     referencia no hay de dónde deducir el coeficiente, y poner 1,0 —o 1,4— sería elegir por
//     el usuario un número que cambia el resultado. Esas combinaciones quedan con la columna
//     vacía y se informan aparte, para que las complete quien sabe qué quiso escribir.
//
// ── SE INFORMA SIEMPRE ──────────────────────────────────────────────────────────
//
// Esto MODIFICA la matriz del usuario, así que no puede pasar en silencio: se devuelve el
// detalle de qué se tocó y la pantalla lo muestra hasta que se lo acepta. Una migración
// muda es un cambio de números sin autor.
import { HIP_DS, CAT_POR_K } from '../constants/hipotesis.js';

const n0 = (v) => (typeof v === "number" && isFinite(v) ? v : 0);

// Inserta una clave en la lista respetando el orden del catálogo. Sólo se usa para las
// hipótesis que el programa agrega; las que trae el modelo del usuario siguen yendo al final.
function insertarCanonico(hips, k, orden) {
  if (hips.includes(k)) return hips;
  const iCat = orden.indexOf(k);
  if (iCat < 0) return [...hips, k];
  // primera posición cuya hipótesis va DESPUÉS que la nueva en el catálogo
  const i = hips.findIndex(h => {
    const j = orden.indexOf(h);
    return j >= 0 && j > iCat;
  });
  return i < 0 ? [...hips, k] : [...hips.slice(0, i), k, ...hips.slice(i)];
}

// `estado` es el objeto del proyecto (de localStorage o del archivo). Devuelve uno nuevo y el
// parte de lo que se cambió. Nunca tira: un proyecto ilegible se devuelve tal cual.
export function migrarProyecto(estado, { ordenCatalogo = [] } = {}) {
  if (!estado || typeof estado !== "object") return { estado, cambios: null };

  const hips0 = Array.isArray(estado.hips) ? estado.hips : [];
  const combosU = Array.isArray(estado.combosU) ? estado.combosU : [];
  const combosS = Array.isArray(estado.combosS) ? estado.combosS : [];

  // Nada que hacer si ya conoce `Ds`: ni la lista ni las matrices se tocan.
  const faltaEnLista = !hips0.includes(HIP_DS);
  const sinFactor = (cs) => cs.filter(c => {
    const f = c?.f ?? c;
    return f && typeof f === "object" && f[HIP_DS] === undefined && n0(f.PP) !== 0;
  }).length;
  const nU = sinFactor(combosU), nS = sinFactor(combosS);
  if (!faltaEnLista && !nU && !nS) return { estado, cambios: null };

  const conDs = (cs) => cs.map(c => {
    const f = c?.f ?? c;
    if (!f || typeof f !== "object") return c;
    if (f[HIP_DS] !== undefined || n0(f.PP) === 0) return c;
    // `Ds` primero en el objeto, igual que en los sets por defecto
    const nf = { [HIP_DS]: f.PP, ...f };
    return c?.f ? { ...c, f: nf } : nf;
  });

  // Las que no tienen `PP` y por lo tanto quedaron sin coeficiente deducible.
  const huerfanas = (cs, pref) => cs
    .map((c, i) => ({ c: c?.f ?? c, n: `${pref}${i + 1}` }))
    .filter(({ c }) => c && typeof c === "object"
      && c[HIP_DS] === undefined && n0(c.PP) === 0
      && Object.values(c).some(v => n0(v) !== 0))
    .map(({ n }) => n);

  const sinRef = [...huerfanas(combosU, "ELU"), ...huerfanas(combosS, "ELS")];

  return {
    estado: {
      ...estado,
      hips: faltaEnLista ? insertarCanonico(hips0, HIP_DS, ordenCatalogo) : hips0,
      combosU: conDs(combosU),
      combosS: conDs(combosS),
    },
    cambios: {
      hip: HIP_DS,
      rotulo: CAT_POR_K[HIP_DS]?.rotulo || HIP_DS,
      enLista: faltaEnLista,
      combos: nU + nS,
      sinRef,
    },
  };
}
