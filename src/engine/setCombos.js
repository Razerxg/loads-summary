// GUARDAR Y REUSAR LAS MATRICES DE COMBINACIÓN.
//
// Las combinaciones son lo que menos cambia de un proyecto a otro y lo que más trabajo da
// tipear: una oficina usa el mismo criterio en todos sus modelos. Exportarlas por separado
// del proyecto permite armar el set una vez, revisarlo, y traerlo a cualquier planilla de
// reacciones sin arrastrar cargas ni niveles.
//
// ⚠ UNA HIPÓTESIS DESCONOCIDA NO SE DESCARTA. Es la diferencia con el módulo homónimo de
// `bases-v-0.1`: allá la lista de hipótesis es una constante del programa, así que un
// factor sobre `Q1` no podía significar nada y se quitaba avisando. Acá la lista es del
// PROYECTO y puede crecer, de modo que un set traído de otro modelo perfectamente puede
// referirse a hipótesis que este proyecto todavía no tiene. Tirarlas rompería el set en
// silencio; se importan enteras y se informa cuáles hay que agregar.
//
// DOS COSAS QUE ESTE MÓDULO SIGUE SIN HACER, y son decisiones:
//
//  · **NO EXPORTA LA CLAVE `k` DE CADA COMBINACIÓN.** Es la identidad de React, un
//    `Math.random()` de la sesión: no significa nada fuera de ella y dos archivos hechos en
//    momentos distintos podrían traer la misma. Al importar se generan claves nuevas.
//  · **NO INTERPRETA UN FACTOR ILEGIBLE COMO CERO.** `"1,4"` con coma, o una celda vacía
//    donde iba un número, es un ERROR del archivo y aborta la importación entera. Tomarlo
//    como 0 daría una combinación que parece válida y no es la que se quiso guardar, que es
//    la peor forma de fallar.
import { mkCombo } from '../constants/combosDef.js';

export const SET_TIPO = "reacciones.combos";
export const SET_VER = 1;
const SETS = ["ELU", "ELS"];

// Deja el objeto de factores sin los ceros: un factor cero es «esta hipótesis no participa»,
// que es lo mismo que no estar. El archivo queda legible y los diffs entre dos sets muestran
// diferencias reales. El ORDEN es el de la lista viva que se pase, para que el archivo se
// lea igual que la matriz en pantalla.
function limpiar(f, hips) {
  const o = {};
  const claves = hips?.length ? hips.filter(k => k in (f || {})) : Object.keys(f || {});
  for (const k of claves) {
    const v = Number(f?.[k]);
    if (Number.isFinite(v) && v !== 0) o[k] = v;
  }
  // lo que el proyecto ya no tiene en su lista pero el objeto sí: se conserva igual, para
  // no perder un factor por el mero hecho de que la hipótesis se haya sacado de la lista
  for (const [k, v] of Object.entries(f || {})) {
    if (k in o) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n !== 0) o[k] = n;
  }
  return o;
}

export function serializarCombos({ combosU = [], combosS = [], hips = [], nombre = "" } = {}) {
  return {
    tipo: SET_TIPO,
    version: SET_VER,
    generado: new Date().toISOString(),
    nombre,
    // Se guarda la lista viva del proyecto. Al importar sirve para saber en qué orden
    // mostrar las columnas y cuáles hipótesis hay que agregarle al proyecto de destino.
    hipotesis: [...hips],
    sets: {
      ELU: combosU.map(c => limpiar(c.f ?? c, hips)),
      ELS: combosS.map(c => limpiar(c.f ?? c, hips)),
    },
  };
}

// Devuelve `{ ok, sets, hipotesis, nombre, avisos }` o `{ ok:false, error }`. Nunca tira.
export function leerCombos(texto) {
  let d;
  try { d = typeof texto === "string" ? JSON.parse(texto) : texto; }
  catch { return { ok: false, error: "El archivo no es JSON válido." }; }
  if (!d || typeof d !== "object" || Array.isArray(d)) {
    return { ok: false, error: "El archivo no tiene la forma de un set de combinaciones." };
  }
  // Se acepta tanto el formato propio como un objeto pelado `{ ELU: [...], ELS: [...] }`,
  // que es lo que sale de editar el archivo a mano o de armarlo desde una planilla.
  const crudo = d.sets && typeof d.sets === "object" ? d.sets : d;
  if (d.tipo && d.tipo !== SET_TIPO && d.tipo !== "bases.combos") {
    return { ok: false, error: `El archivo dice ser «${d.tipo}», no un set de combinaciones.` };
  }
  // Un set exportado desde `bases-v-0.1` se acepta tal cual: son las mismas matrices con
  // los mismos nombres de hipótesis. Es el camino natural entre las dos apps.
  const deBases = d.tipo === "bases.combos";

  const avisos = [];
  const vistas = new Set();
  const sets = {};
  for (const s of SETS) {
    const arr = crudo[s];
    if (arr === undefined || arr === null) continue;
    if (!Array.isArray(arr)) return { ok: false, error: `El set ${s} no es una lista de combinaciones.` };
    const fs = [];
    for (let i = 0; i < arr.length; i++) {
      const c = arr[i];
      // se tolera `{ f: {...} }` por si alguien exportó una fila entera de la app
      const f = c && typeof c === "object" && !Array.isArray(c) && c.f && typeof c.f === "object"
        ? c.f : c;
      if (!f || typeof f !== "object" || Array.isArray(f)) {
        return { ok: false, error: `${s}${i + 1} no es una combinación: se esperaba un objeto `
          + "de la forma { \"Do\": 1.2, \"Wx+\": 1.0 }." };
      }
      const o = {};
      for (const [k, v] of Object.entries(f)) {
        if (k === "k") continue;                       // identidad de sesión: se descarta
        // `Ds` es el peso propio de la FUNDACIÓN, que `bases` calcula sola y esta app no
        // tiene: no hay ninguna reacción del modelo que le corresponda. Se descarta con
        // aviso en vez de crear una hipótesis fantasma que sumaría cero para siempre.
        if (deBases && k === "Ds") { vistas.add("Ds"); continue; }
        // `Number("")` y `Number(null)` valen CERO, que es exactamente la confusión que
        // este bloque existe para evitar: una celda vacía donde iba un factor no es un
        // factor nulo, es un archivo incompleto.
        const n = typeof v === "number" ? v
          : (typeof v === "string" && v.trim() !== "" ? Number(v) : NaN);
        if (!Number.isFinite(n)) {
          return { ok: false, error: `El factor de ${k} en ${s}${i + 1} no es un número: `
            + `«${v}». Revisá que los decimales usen punto, no coma.` };
        }
        if (n !== 0) o[k] = n;
      }
      fs.push(o);
    }
    sets[s] = fs;
    // Una combinación sin ninguna hipótesis no es inofensiva: entra en el listado y da
    // todas las componentes en cero, que se lee como un resultado y no como un error de
    // armado.
    const vacias = fs.reduce((n, f, i) => Object.keys(f).length === 0 ? [...n, i + 1] : n, []);
    if (vacias.length) {
      avisos.push(`${s}: ${vacias.length === 1 ? "la combinación" : "las combinaciones"} `
        + `${vacias.map(i => s + i).join(", ")} ${vacias.length === 1 ? "no tiene" : "no tienen"} `
        + "ninguna hipótesis. Van a dar todo cero.");
    }
  }

  if (!SETS.some(s => sets[s])) {
    return { ok: false, error: "El archivo no trae ni ELU ni ELS." };
  }
  if (vistas.has("Ds")) {
    avisos.push("El set viene de la app de bases y usa «Ds», el peso propio de la fundación, "
      + "que allá lo calcula el programa a partir de la geometría. Acá no existe: se quitó de "
      + "todas las combinaciones. Si lo necesitás, agregalo como una hipótesis más y cargale "
      + "el valor a mano.");
  }
  // Todas las hipótesis que el archivo menciona, en el orden en que aparecen. La pantalla
  // las cruza contra la lista del proyecto y ofrece agregar las que falten.
  const hipotesis = d.hipotesis?.length ? [...d.hipotesis].filter(k => k !== "Ds")
    : [...new Set(SETS.flatMap(s => (sets[s] || []).flatMap(f => Object.keys(f))))];

  return { ok: true, sets, hipotesis, nombre: typeof d.nombre === "string" ? d.nombre : "", avisos };
}

// Las combinaciones listas para el estado, con claves nuevas.
export const aCombos = (fs) => fs.map(f => mkCombo({ ...f }));
