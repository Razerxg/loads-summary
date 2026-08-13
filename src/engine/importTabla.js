// IMPORTAR LA TABLA «REACCIONES EN LOS NUDOS, POR HIPÓTESIS» DE CYPE.
//
// Portado de `bases-v-0.1`, donde el intérprete se peleó con una planilla real durante
// varias rondas. Los comentarios que explican POR QUÉ cada guarda existe se conservan
// enteros: son la memoria de errores que no fallan, sino que dan un resultado plausible y
// equivocado, que es la única clase que importa acá.
//
// TRES DIFERENCIAS DE ALCANCE con el original, y las tres son a propósito:
//
//  1. **EL TORSOR SE IMPORTA.** Allá `Mz` se leía sólo para no descolocar las columnas y
//     después se tiraba, porque una fundación directa no se verifica a torsión. Esta app
//     no verifica nada: descartar una columna que el usuario cargó es perder un dato suyo.
//  2. **NO SE REPARTE EL «PESO PROPIO».** Allá se sumaba a De/Do/Dt porque esas tres son
//     pesos totales por estado. Acá el peso propio es una hipótesis más y su factor lo pone
//     el usuario en cada combinación, igual que en CYPE.
//  3. **UNA HIPÓTESIS DESCONOCIDA NO SE DESCARTA: SE PROPONE.** Allá la lista de hipótesis
//     es una constante del programa y lo que no está en ella no existe. Acá un modelo puede
//     traer `V(0°)H1` o `Q1`, y tirar esas filas dejaría la importación muda justo donde
//     más se nota. Se leen igual, con su nombre tal cual vino, y el importador informa
//     cuáles son nuevas para que se agreguen a la lista del proyecto.
//
// No hay OCR en esta app: la entrada es la PLANILLA o el texto pegado. Por eso tampoco
// están las correcciones de nombres mal reconocidos que sí necesitaba el original.
import { COMP_KEYS } from '../constants/componentes.js';

// Un número en notación científica, entero y solo en la celda. El exponente va PEGADO a
// la `E` y con sus dígitos: así `3,5 E` —un rótulo con una unidad suelta— no cae acá.
const RE_CIENT = /^[+-]?\d+(?:[.,]\d+)?[eE][+-]?\d+$/;

// Número escrito a la europea o a la inglesa. Devuelve null si no es un número.
export function numLat(s) {
  if (typeof s === "number") return isFinite(s) ? s : null;
  if (s == null) return null;
  let t = String(s).trim().replace(/\s+/g, "");
  if (!t) return null;
  // UN RÓTULO NO ES UN NÚMERO. La limpieza de abajo saca todo lo que no sea cifra, y con
  // eso «N4» —la referencia del nudo, que aparece sólo en la primera fila del bloque— se
  // leía como el número 4. Esa fila terminaba con un valor de más y TODAS sus componentes
  // corridas un lugar, sin que nada fallara.
  if (/^[A-Za-z]{1,2}\d{1,3}$/.test(t)) return null;
  // NOTACIÓN CIENTÍFICA — se reconoce ENTERA y antes de limpiar.
  //
  // Excel guarda todo valor chico así: un corte de 0,018 kN queda escrito
  // `1.7999999999999999E-2`. La limpieza de abajo le saca la `E` y deja `1.79…-2`, que no
  // es un número, así que la celda devolvía `null` y esa componente DESAPARECÍA de la
  // hipótesis sin que nada lo avisara. Peor todavía en `numerosDe`, que devolvía DOS
  // números —`1.8` y `-2`— y descolocaba la fila entera.
  if (RE_CIENT.test(t)) return Number(t.replace(",", "."));
  t = t.replace(/[^\d.,+-]/g, "");
  if (!t || !/\d/.test(t)) return null;
  // si aparecen los dos separadores, manda el ÚLTIMO como decimal
  const iC = t.lastIndexOf(","), iP = t.lastIndexOf(".");
  if (iC >= 0 && iP >= 0) {
    t = iC > iP ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  } else if (iC >= 0) {
    t = t.replace(",", ".");
  }
  const v = Number(t);
  return isFinite(v) ? v : null;
}

// TODOS los números de una celda, en orden.
//
// Al pegar texto, dos columnas pueden quedar juntas en la misma celda y salir algo como
// «|-6.233|-20.590|». `numLat` sobre eso devuelve null —no es UN número— y esos dos
// valores se perdían: la fila quedaba con cuatro en vez de seis y TODAS sus componentes
// corridas. Lo que importa para alinear una fila es la SECUENCIA de números que trae, no
// en qué celda vino cada uno.
export function numerosDe(cel) {
  if (typeof cel === "number") return isFinite(cel) ? [cel] : [];
  const t = String(cel ?? "").trim();
  if (!t) return [];
  if (/^[A-Za-z]{1,2}\d{1,3}$/.test(t.replace(/\s+/g, ""))) return [];
  const out = [];
  // El exponente forma parte del número: sin él, `1.8E-2` se leía como DOS valores —el
  // `1.8` y un `-2` inventado— y la fila terminaba con un número de más.
  for (const m of t.matchAll(/[+-]?\d+(?:[.,]\d+)?(?:[eE][+-]?\d+)?/g)) {
    const v = numLat(m[0]);
    if (v !== null) out.push(v);
  }
  return out;
}

// ── texto pegado ────────────────────────────────────────────────────────────────
//
// Se corta por tabulaciones, punto y coma, barra vertical o dos o más espacios: son los
// separadores que producen todas las fuentes habituales. Un solo espacio NO separa, porque
// partiría «Peso propio» en dos celdas.
//
// ⚠ CON TABULACIONES, LAS CELDAS VACÍAS SE CONSERVAN. Es la diferencia con el original de
// `bases`, que las descartaba siempre, y arregla un modo de falla concreto:
//
//   · Un bloque TRANSPUESTO —hipótesis en el encabezado— empieza con una celda de esquina
//     vacía. Al descartarla, la primera fila quedaba con una celda menos que las demás y el
//     transpuesto corría TODO una columna: la fila de `Do` terminaba con los valores de
//     `De`. No fallaba nada; la tabla salía completa y con los números de la hipótesis
//     equivocada.
//
// La tabulación es un separador EXACTO —Excel emite una por columna, siempre— así que una
// celda vacía entre dos tabs es un dato posicional y no un artefacto. Con los otros
// separadores no se puede afirmar lo mismo: dos o más espacios seguidos pueden ser
// alineación, y ahí las vacías se siguen descartando.
//
// Como efecto lateral bienvenido, esto también arregla por posición el caso de la columna
// «Referencia» combinada: al conservarse su celda vacía, la fila tiene exactamente el mismo
// ancho que el encabezado.
export function matrizDesdeTexto(txt) {
  return String(txt || "")
    .split(/\r?\n/)
    .map(l => l.replace(/\s+$/, ""))
    .filter(l => l.trim() !== "")
    .map(l => l.includes("\t")
      ? l.split("\t").map(c => c.trim())
      : l.trim().split(/\s*[;|]\s*|\s{2,}/).map(c => c.trim()).filter(c => c !== ""))
    .filter(f => f.length > 0);
}

// ── NOMBRES DE COLUMNA ──────────────────────────────────────────────────────────
//
// "Myy", "MYY", "M_yy", "Myy (kN·m)" → "Myy". Devuelve null si no es una componente.
// Se aceptan las tres notaciones que llegan en la práctica:
//   · interna:            N   Vx  Vy  Myy Mxx T
//   · resumen de fuerzas: Fz  Fx  Fy  My  Mx  Mz
//   · reacciones de CYPE: Rz  Rx  Ry  My  Mx  Mz
// OJO: se traduce el NOMBRE, no el SIGNO. `N` es positiva en compresión sobre el apoyo; si
// el modelo da la reacción vertical positiva hacia arriba hay que invertirla, y eso no se
// adivina. Se avisa cuando el encabezado viene en notación de reacciones.
const ALIAS_COMP = {
  n: "N", fz: "N", rz: "N",
  vx: "Vx", fx: "Vx", rx: "Vx",
  vy: "Vy", fy: "Vy", ry: "Vy",
  myy: "Myy", my: "Myy",
  mxx: "Mxx", mx: "Mxx",
  t: "T", mz: "T", mt: "T", mzz: "T",
};
// las claves largas primero, para que "mxx" no quede capturado por "mx"
const CLAVES_COMP = Object.keys(ALIAS_COMP).sort((a, b) => b.length - a.length);
const UNIDAD = /^(k?n|k?nm|k?nxm|kg|kgm|kgf|tn|tm|t?m|)$/;

export function normComp(txt) {
  const t = String(txt || "").toLowerCase().replace(/[\s_().·×\[\]]/g, "");
  if (!t) return null;
  if (ALIAS_COMP[t]) return ALIAS_COMP[t];
  for (const k of CLAVES_COMP) {
    // el resto tiene que ser una unidad: así "total" no se confunde con la columna «T»
    if (t.startsWith(k) && UNIDAD.test(t.slice(k.length))) return ALIAS_COMP[k];
  }
  return null;
}

// ── ÓRDENES DE COLUMNA CUANDO NO HAY ENCABEZADO ─────────────────────────────────
//
// Un bloque pegado a mano muchas veces se corta arriba y llega SIN la fila de nombres.
// Asumir siempre el orden interno era el error: la tabla de CYPE tiene otro —el axial va
// TERCERO, no primero— y los valores entraban todos cambiados de componente, con el corte
// según X terminando de axial. No fallaba nada; simplemente el cálculo se hacía con otras
// cargas.
export const ORDENES = {
  interno: { label: "N · Vx · Vy · Myy · Mxx · T (interno / resumen de fuerzas)",
    comps: ["N", "Vx", "Vy", "Myy", "Mxx", "T"] },
  cype: { label: "Rx · Ry · Rz · Mx · My · Mz (reacciones de CYPE)",
    comps: ["Vx", "Vy", "N", "Mxx", "Myy", "T"] },
};
export const ORDEN_DEF = "interno";

// ¿Cuál de los dos órdenes es? La señal es FÍSICA: la reacción vertical domina en magnitud
// a los cortes en cualquier apoyo de gravedad. Si la columna que manda es la TERCERA, el
// orden es el de CYPE; si es la primera, el del resumen de fuerzas.
//
// Esto PROPONE, no decide: la vista previa lo dice y el usuario puede cambiarlo. Un caso
// con axial chico y corte grande engañaría a la señal, y por eso no manda sola.
export function detectarOrden(columnas) {
  // Con menos de tres columnas el orden de CYPE no significa nada —el axial va tercero—,
  // así que no hay nada que deducir.
  const anchas = (columnas || []).filter(f => f.length >= 3);
  if (!anchas.length) return { orden: "interno", motivo: "por defecto: no hay columnas suficientes para deducirlo" };
  const med = (k) => {
    const v = anchas.map(f => f[k]).filter(x => typeof x === "number");
    return v.length ? v.reduce((a, x) => a + Math.abs(x), 0) / v.length : 0;
  };
  const c0 = med(0), c2 = med(2);
  if (c2 > 1.6 * c0 && c2 > 0) {
    return { orden: "cype", motivo: "porque la columna que domina en magnitud —el axial— es la TERCERA" };
  }
  return { orden: "interno", motivo: "porque la primera columna es la que domina en magnitud" };
}

// ── NOMBRES DE HIPÓTESIS ────────────────────────────────────────────────────────
//
// Alias de lo que rotula CYPE. Las claves van normalizadas —minúsculas y sin espacios—
// pero CONSERVANDO el ± del viento, que es lo que distingue un sentido del otro.
//
// OJO CON EL GUION: una versión anterior partía el texto por `-` para quedarse con la
// primera palabra, así que «WX-» y «WX+» colapsaban los dos en «wx» y el sentido se perdía
// en silencio. Acá el ± se conserva y sólo se corta por espacios y puntuación.
const ALIAS_HIP = {
  pesopropio: "PP", peso: "PP", pp: "PP",
  "wx+": "Wx+", "wx-": "Wx-", "wy+": "Wy+", "wy-": "Wy-",
  "w+x": "Wx+", "w-x": "Wx-", "w+y": "Wy+", "w-y": "Wy-",
  ts: "Ts", tsx: "Ts", tsy: "Ts",
  eex: "Eex", eey: "Eey", eox: "Eox", eoy: "Eoy",
};

// Devuelve la clave conocida, o null. `hips` es la lista viva del proyecto: una hipótesis
// que ya está en el proyecto se reconoce por su propio nombre aunque no esté en los alias.
export function normHip(txt, hips) {
  const crudo = String(txt || "").trim();
  if (!crudo) return null;
  const t = crudo.toLowerCase();
  const lista = hips || [];
  const probar = (s) => {
    if (!s) return null;
    if (ALIAS_HIP[s]) return ALIAS_HIP[s];
    return lista.find(h => h.toLowerCase() === s) || null;
  };
  const compacto = t.replace(/[\s_().·]/g, "");
  const primera = t.split(/[\s(·:,]/)[0];
  return probar(compacto) || probar(primera) || probar(t) || null;
}

// Un nudo se llama `N1`, `P12`, `A3`: una o dos letras y hasta tres cifras. Es el mismo
// patrón que `numLat` usa para NO leer «N4» como el número 4. Pero `F1` y `F2` tienen esa
// misma forma y son HIPÓTESIS, así que la regla completa es «tiene forma de nudo y NO es
// una hipótesis conocida»; sin esa segunda mitad, cada `F1` abría un bloque nuevo y partía
// todos los nudos en pedazos.
const RE_NUDO = /^[A-Za-z]{1,2}\d{1,3}$/;

export function nudoDe(fila, hips) {
  for (const cel of fila || []) {
    const t = String(cel ?? "").trim();
    if (!t || !RE_NUDO.test(t.replace(/\s+/g, ""))) continue;
    if (normHip(t, hips)) continue;                  // «F1» es hipótesis, no nudo
    return t.replace(/\s+/g, "");
  }
  return null;
}

// UNA ETIQUETA QUE NO ESTÁ EN LA LISTA TAMBIÉN ES UNA HIPÓTESIS.
//
// Es la diferencia de alcance número 3 del encabezado. Se busca primero una hipótesis
// CONOCIDA en cualquier columna —así los alias siguen mandando y `WX+` cae en `Wx+`— y
// recién si no hay ninguna se toma la etiqueta cruda.
//
// Cuál celda es la etiqueta: la ÚLTIMA celda de texto que no sea un número ni una
// referencia de nudo. En la tabla de CYPE el orden es `Referencia · Descripción · Rx …`,
// así que la última de texto es justamente la descripción, pegada a los números. Cuando la
// «Referencia» viene combinada y queda vacía, la única de texto es la descripción y la
// regla da lo mismo.
const RE_UNIDAD_SOLA = /^[([]?\s*(kn|kn·?m|knm|kgf?|kgm|tn|tm|m|mm|cm)\s*[)\]]?$/i;

// UNA CELDA ES UN VALOR SÓLO SI ES ENTERAMENTE UN NÚMERO.
//
// El primer intento preguntaba «¿tiene algún número adentro?» con `numerosDe`, y eso
// rechazaba justo los nombres que genera CYPE: `V(90°)H1` trae el 90 y el 1, así que se
// tomaba por un valor y la hipótesis se perdía. Toda la función de proponer hipótesis
// nuevas quedaba inutilizada para los nombres reales, que son casi todos los que llevan
// dígitos. `numLat` tampoco sirve acá —le saca los caracteres no numéricos y devuelve 901—;
// hace falta el patrón estricto.
const RE_SOLO_NUM = /^[+-]?\d+(?:[.,]\d+)?(?:[eE][+-]?\d+)?$/;
const esValor = (t) => typeof t === "number" || RE_SOLO_NUM.test(String(t).replace(/\s/g, ""));

export function etiquetaDe(fila, hips) {
  const f = fila || [];
  for (let j = 0; j < f.length; j++) {
    const h = normHip(f[j], hips);
    if (h) return { i: j, hip: h, nueva: false };
  }
  let mejor = null;
  for (let j = 0; j < f.length; j++) {
    const crudo = f[j];
    const t = String(crudo ?? "").trim().replace(/\s+/g, " ");
    if (!t) continue;
    if (esValor(crudo)) continue;                    // es un valor, no un rótulo
    if (RE_NUDO.test(t)) continue;                   // es la referencia del nudo
    if (RE_UNIDAD_SOLA.test(t)) continue;            // es la fila de unidades del encabezado
    if (normComp(t)) continue;                       // es un nombre de columna, no una hipótesis
    if (t.length > 40) continue;                     // un título de tabla, no un nombre
    mejor = { i: j, hip: t, nueva: true };
  }
  return mejor;
}

// El bloque puede venir con las hipótesis en filas o en columnas: se detecta y se
// transpone, en vez de exigirle al usuario que acomode la planilla. La señal es dónde
// están los nombres: si la PRIMERA COLUMNA trae componentes (N, Vx, Myy…), las hipótesis
// están en el encabezado y la matriz va transpuesta.
export function orientacionCargas(M, hips) {
  const col0 = (M || []).map(f => f?.[0]);
  const compEnCol0 = col0.filter(c => normComp(c)).length;
  const hipEnCol0 = col0.filter(c => normHip(c, hips)).length;
  const fila0 = (M || [])[0] || [];
  const hipEnFila0 = fila0.filter(c => normHip(c, hips)).length;
  const compEnFila0 = fila0.filter(c => normComp(c)).length;
  if (compEnCol0 >= 2 && hipEnFila0 >= 2 && compEnCol0 > hipEnCol0) {
    return { transponer: true, motivo: "los esfuerzos están en la primera columna y las hipótesis en el encabezado" };
  }
  if (hipEnCol0 >= 2 || compEnFila0 >= 2) {
    return { transponer: false, motivo: "las hipótesis están en la primera columna" };
  }
  return { transponer: false, motivo: "no se detectó la disposición: se asume una fila por hipótesis" };
}

const traspM = (M) => {
  const n = Math.max(...M.map(f => f.length), 0);
  return Array.from({ length: n }, (_, j) => M.map(f => f[j] ?? ""));
};

// Cuántos números tiene que traer una fila para que se la considere una fila de datos con
// una hipótesis NUEVA. Con uno solo, cualquier renglón de notas que lleve un número al lado
// de una palabra abriría una hipótesis inventada. Una reacción trae hasta seis.
const MIN_NUMS_HIP_NUEVA = 2;

// ── INTÉRPRETE ──────────────────────────────────────────────────────────────────
export function cargasDesdeMatriz(M0, hips, { orden = null } = {}) {
  const avisos = [];
  if (!M0?.length) return { ok: false, avisos: ["No se reconoció ninguna fila."] };
  const or = orientacionCargas(M0, hips);
  const M = or.transponer ? traspM(M0) : M0;
  if (or.transponer) avisos.push(`Se transpuso el bloque: ${or.motivo}.`);

  // ¿Hay fila de encabezado con nombres de componentes?
  //
  // Se miran las primeras CINCO filas y no tres: la tabla de CYPE trae un encabezado de
  // varios niveles («Reacciones en los nudos» / «Reacciones en ejes globales» / «Rx Ry
  // Rz…» / «(kN) (kN)…»), así que la fila con los nombres queda más abajo.
  //
  // DOS nombres alcanzan para dar por buena la fila. Con el umbral en tres, un bloque
  // angosto —«Hip N Vx»— se tomaba por SIN encabezado y el orden de sus columnas pasaba a
  // deducirse, pudiendo errar. Un encabezado real es lo único que da certeza, así que
  // conviene aceptarlo apenas se lo reconoce; no hay riesgo de confundir una fila de datos,
  // porque `normComp` no reconoce números ni nombres de hipótesis.
  let mapa = null, iCab = -1;
  for (let i = 0; i < Math.min(5, M.length); i++) {
    const m = M[i].map(normComp);
    if (m.filter(Boolean).length >= 2) { mapa = m; iCab = i; break; }
  }

  // SIN ENCABEZADO hay que decidir el orden de las columnas ANTES de asignar nada, así que
  // se hace una pasada previa juntando los números de cada fila. Con encabezado esto no
  // corre: ahí el orden lo dice la tabla.
  let ordenUsado = null, ordenMotivo = "";
  if (!mapa) {
    const crudas = [];
    for (const f of M) {
      const e = etiquetaDe(f, hips);
      if (!e) continue;
      crudas.push(f.filter((_, j) => j !== e.i).flatMap(numerosDe));
    }
    const d = detectarOrden(crudas);
    ordenUsado = orden && ORDENES[orden] ? orden : d.orden;
    ordenMotivo = orden && ORDENES[orden] ? "elegido a mano" : d.motivo;
    avisos.push(`El bloque no trae la fila de nombres de las columnas. Se asumió el orden `
      + `«${ORDENES[ordenUsado].label}» ${ordenMotivo}. `
      + `Si no es ése, cambialo en el selector: los valores se reasignan al instante.`);
  }

  const filas = [], sinHip = [], nuevas = [];
  for (let i = 0; i < M.length; i++) {
    if (i === iCab) continue;
    const f = M[i];
    const e = etiquetaDe(f, hips);
    const nums = e ? f.flatMap((cel, j) => (j === e.i ? [] : numerosDe(cel))) : [];
    // Una etiqueta NUEVA necesita más evidencia que una conocida: se exige que la fila
    // traiga varios números. Ver `MIN_NUMS_HIP_NUEVA`.
    if (!e || (e.nueva && nums.length < MIN_NUMS_HIP_NUEVA)) {
      if (f.some(c => numerosDe(c).length)) sinHip.push(f.join(" "));
      continue;
    }
    const hip = e.hip;
    if (e.nueva && !nuevas.includes(hip)) nuevas.push(hip);

    const vals = {};
    if (mapa) {
      // POSICIÓN ABSOLUTA SÓLO SI LA FILA TIENE LA MISMA FORMA QUE EL ENCABEZADO.
      //
      // En la tabla de CYPE la columna «Referencia» trae el nudo (N1) sólo en la PRIMERA
      // fila y queda vacía en las demás —es una celda combinada—. Como al partir el texto
      // se descartan las celdas vacías, esas filas tienen una celda MENOS que el encabezado
      // y el mapeo por posición se corre: el Rx del peso propio caía en Vx, el Ry de la
      // fila siguiente en Vy, y así. Los números entraban todos, corridos uno, sin que nada
      // fallara.
      //
      // Cuando la fila trae exactamente tantos números como componentes hay declaradas, se
      // alinean EN ORDEN, que es inmune a las columnas de texto que falten.
      const comps = mapa.filter(Boolean);
      const pon = (c, v) => { if (c && v !== undefined && v !== null) vals[c] = v; };
      if (nums.length === comps.length) {
        comps.forEach((c, k) => { pon(c, nums[k]); });
      } else if (f.length === mapa.length) {
        mapa.forEach((c, j) => { if (c && j !== e.i) pon(c, numLat(f[j])); });
      } else {
        comps.forEach((c, k) => { pon(c, nums[k]); });
        avisos.push(`La fila de ${hip} traía ${nums.length} números y el encabezado declara `
          + `${comps.length} componentes: se asignaron en orden. Revisá esa fila.`);
      }
    } else {
      const seq = ORDENES[ordenUsado]?.comps || ORDENES[ORDEN_DEF].comps;
      seq.forEach((c, k) => { if (nums[k] !== undefined) vals[c] = nums[k]; });
      if (nums.length > seq.length) {
        avisos.push(`La fila de ${hip} traía ${nums.length} números y el orden asumido declara `
          + `${seq.length} columnas: se tomaron las primeras. Revisá esa fila.`);
      }
    }
    if (!Object.keys(vals).length) continue;
    filas.push({ hip, vals, nueva: e.nueva });
  }

  if (!filas.length) {
    return { ok: false, avisos: ["Ninguna fila trajo una etiqueta de hipótesis con valores al lado. "
      + "Revisá que la tabla tenga una columna de descripción con el nombre de cada hipótesis."] };
  }
  if (sinHip.length) {
    // Se listan: una hipótesis perdida son seis valores que faltan y nada que lo delate en
    // la grilla. Saber cuál fue es lo que permite corregirla a mano.
    avisos.push(`${sinHip.length} fila(s) con números se descartaron por no traer una etiqueta `
      + `utilizable: ${sinHip.slice(0, 4).map(f => `«${f.slice(0, 40)}»`).join(" · ")}`
      + `${sinHip.length > 4 ? " …" : ""}.`);
  }
  const dup = filas.map(f => f.hip).filter((h, i, a) => a.indexOf(h) !== i);
  if (dup.length) avisos.push(`Hipótesis repetidas (manda la última): ${[...new Set(dup)].join(", ")}.`);

  // AVISO DE SIGNO. Si el encabezado venía en notación de REACCIONES (Rz/Fz), hay que mirar
  // el criterio: `N` es positiva en COMPRESIÓN sobre el apoyo, y una reacción vertical
  // suele darse positiva hacia arriba. Traducir el nombre es automático; traducir el signo
  // no, porque depende de la convención de quien exportó el modelo, y ningún control
  // automático puede distinguir un signo mal de una tracción real.
  if (iCab >= 0 && M[iCab].some(c => /^\s*[rf]z\b/i.test(String(c || "")))) {
    avisos.push("El encabezado viene como REACCIONES (Rz/Fz). Se tradujo el NOMBRE, no el SIGNO: "
      + "en esta app N es positiva en compresión sobre el apoyo. Si el modelo da la reacción "
      + "vertical positiva hacia arriba, invertí el signo de N antes de combinar.");
  }

  return { ok: true, filas, avisos, nuevas, porNombre: !!mapa,
    sinEncabezado: !mapa, orden: ordenUsado,
    transpuesto: or.transponer, orientMotivo: or.motivo };
}

// ── UNA PLANILLA CON VARIOS NUDOS ───────────────────────────────────────────────
//
// La tabla de reacciones real no trae un nudo: trae todos los del modelo, uno abajo del
// otro. Un importador que recorra las filas de corrido sin mirar la columna «Referencia»
// los APLANA: una planilla de cuatro nudos con diecisiete hipótesis cada uno da diecisiete
// filas, la hipótesis `De` aparece cuatro veces y gana la última. Los otros tres nudos se
// pierden sin que se note, porque el resultado tiene exactamente la pinta de una
// importación correcta de un nudo.
//
// SE PARTE POR EL NOMBRE DEL NUDO, NO POR LA COLUMNA. La referencia aparece SÓLO en la
// primera fila de cada bloque —es una celda combinada— y al pegar el bloque como texto las
// celdas vacías se descartan, así que en la mitad de las filas esa columna ni existe.
// Buscar la etiqueta en cualquier posición es lo único que funciona con las dos entradas.
export function partirPorNudo(M, hips) {
  const filas = M || [];
  // El encabezado es todo lo que hay ANTES de la primera fila con etiqueta de hipótesis.
  // No se busca por contenido: una tabla puede tener una, tres o ninguna fila de títulos.
  let iDato = filas.findIndex(f => {
    const e = etiquetaDe(f, hips);
    return e && (!e.nueva || f.flatMap(numerosDe).length >= MIN_NUMS_HIP_NUEVA);
  });
  if (iDato < 0) iDato = 0;
  const cab = filas.slice(0, iDato);

  const bloques = [];
  for (let i = iDato; i < filas.length; i++) {
    const f = filas[i];
    const n = nudoDe(f, hips);
    if (n !== null) bloques.push({ nombre: n, filas: [] });
    // Las filas anteriores al primer nudo forman un bloque SIN NOMBRE: es la planilla de un
    // solo nudo, que es como viene un modelo chico y tiene que andar igual.
    if (!bloques.length) bloques.push({ nombre: "", filas: [] });
    bloques[bloques.length - 1].filas.push(f);
  }
  // Repetirle el encabezado a cada bloque es lo que permite reusar `cargasDesdeMatriz` tal
  // cual, con su detección de columnas y sus alias. Un intérprete aparte para el caso
  // multinudo serían dos intérpretes que se van separando.
  return { cab, bloques: bloques.map(b => ({ ...b, filas: [...cab, ...b.filas] })) };
}

// Interpreta la planilla entera y devuelve UN RESULTADO POR NUDO.
//
// El orden de las columnas se decide UNA SOLA VEZ, sobre la tabla completa, y se le impone
// a todos los bloques. Dejando que cada uno lo dedujera por su cuenta, dos nudos de la
// misma planilla podían quedar interpretados con órdenes distintos —uno como reacciones de
// CYPE y el otro como resumen de fuerzas— y el resultado no tendría sentido físico ni forma
// de notarse: son los mismos seis números cambiados de nombre.
export function cargasPorNudo(M0, hips, { orden = null } = {}) {
  if (!M0?.length) return { ok: false, avisos: ["No se reconoció ninguna fila."] };

  // La disposición se resuelve antes de partir: si las hipótesis estuvieran en el
  // encabezado, los nudos no estarían en filas y partir por filas no significaría nada.
  const or = orientacionCargas(M0, hips);
  const M = or.transponer ? traspM(M0) : M0;

  const global = cargasDesdeMatriz(M, hips, { orden });
  const ordenGlobal = orden || global.orden || null;

  const { bloques } = partirPorNudo(M, hips);
  const avisos = or.transponer ? [`Se transpuso el bloque: ${or.motivo}.`] : [];
  const nudos = [];
  for (const b of bloques) {
    const r = cargasDesdeMatriz(b.filas, hips, { orden: ordenGlobal });
    if (!r.ok) {
      avisos.push(`El nudo ${b.nombre || "(sin nombre)"} no se pudo interpretar: ${r.avisos.join(" ")}`);
      continue;
    }
    nudos.push({ nombre: b.nombre, filas: r.filas, avisos: r.avisos, nuevas: r.nuevas });
  }
  if (!nudos.length) {
    return { ok: false, avisos: avisos.length ? avisos : (global.avisos || ["No se reconoció ninguna carga."]) };
  }

  // Los avisos que valen para toda la planilla se dicen UNA vez y no una por nudo: con
  // cuatro nudos, el aviso del signo de las reacciones aparecía cuatro veces y tapaba a los
  // que sí eran de un nudo en particular.
  const comunes = new Set();
  for (const n of nudos) for (const a of n.avisos) {
    if (nudos.every(m => m.avisos.includes(a))) comunes.add(a);
  }
  for (const n of nudos) n.avisos = n.avisos.filter(a => !comunes.has(a));

  const rep = [...new Set(nudos.map(n => n.nombre).filter((v, i, a) => a.indexOf(v) !== i))];
  if (rep.length) avisos.push(`Nudos repetidos en la planilla: ${rep.join(", ")}.`);

  // Las hipótesis nuevas se juntan de TODOS los nudos: el usuario las agrega una vez al
  // proyecto y valen para la planilla entera.
  const nuevas = [...new Set(nudos.flatMap(n => n.nuevas || []))];

  return {
    ok: true, nudos, avisos: [...avisos, ...comunes], nuevas,
    porNombre: global.porNombre, sinEncabezado: global.sinEncabezado,
    orden: ordenGlobal, transpuesto: or.transponer, orientMotivo: or.motivo,
    componentes: COMP_KEYS,
  };
}

export const cargasDesdeTexto = (txt, hips, op) => cargasDesdeMatriz(matrizDesdeTexto(txt), hips, op);
export const cargasPorNudoDesdeTexto = (txt, hips, op) => cargasPorNudo(matrizDesdeTexto(txt), hips, op);
