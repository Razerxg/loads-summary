// LEER UNA PLANILLA .XLSX — sin dependencias.
//
// Hasta acá la tabla de reacciones entraba pegada como texto o por OCR de una captura.
// Las dos funcionan, pero las dos son un rodeo: el analista de stress entrega un ARCHIVO,
// y hacerle abrirlo, seleccionar el bloque y copiarlo es pedirle un paso que puede salir
// mal —seleccionar de menos es perder un nudo entero, y no se nota—.
//
// POR QUÉ A MANO Y NO CON UNA BIBLIOTECA. Un `.xlsx` es un ZIP con XML adentro, y de todo
// lo que ese formato permite acá hacen falta tres cosas: las cadenas compartidas, los
// valores de las celdas y en qué fila y columna está cada una. SheetJS resuelve además
// fórmulas, fechas, estilos, gráficos y formatos heredados, y pesa más que toda esta app.
// El navegador ya trae el inflate (`DecompressionStream`), así que la parte cara del
// problema está resuelta y lo que queda es leer dos estructuras bien documentadas.
// Es el mismo criterio con el que se escribió el exportador DXF a mano.
//
// EL RIESGO DE ESTA DECISIÓN, dicho de frente: una planilla rara puede no leerse. Por eso
// **pegar el texto sigue existiendo** y es la salida cuando esto falla; el importador no
// depende de que esta función ande. Si no se puede leer, se dice por qué y se ofrece el
// otro camino, en vez de dejar una tabla vacía sin explicación.

// ── ZIP ──────────────────────────────────────────────────────────────────────
//
// Se lee el DIRECTORIO CENTRAL, no los encabezados locales. Es la diferencia entre leer
// un ZIP y adivinarlo: el encabezado local puede declarar tamaño 0 y dejar los tamaños
// reales en un descriptor DESPUÉS de los datos —es lo que hace cualquier programa que
// comprime al vuelo, Excel incluido en algunas versiones— y quien confía en él lee cero
// bytes. El directorio central siempre los tiene.
const SIG_EOCD = 0x06054b50, SIG_CEN = 0x02014b50, SIG_LOC = 0x04034b50;

function entradasZip(buf) {
  const dv = new DataView(buf);
  // el fin del directorio central está al final, después de un comentario de largo
  // variable: se busca hacia atrás, que es como manda el formato
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= 0 && i >= buf.byteLength - 22 - 65535; i--) {
    if (dv.getUint32(i, true) === SIG_EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("El archivo no es un ZIP válido (no se encontró el fin del directorio central). ¿Es realmente un .xlsx?");

  const n = dv.getUint16(eocd + 10, true);
  let off = dv.getUint32(eocd + 16, true);
  if (off === 0xffffffff) throw new Error("La planilla usa ZIP64. Guardala de nuevo como .xlsx normal, o pegá el bloque como texto.");

  const out = new Map();
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(off, true) !== SIG_CEN) break;
    const metodo = dv.getUint16(off + 10, true);
    const comp = dv.getUint32(off + 20, true);
    const nLen = dv.getUint16(off + 28, true);
    const eLen = dv.getUint16(off + 30, true);
    const cLen = dv.getUint16(off + 32, true);
    const loc = dv.getUint32(off + 42, true);
    const nombre = new TextDecoder().decode(new Uint8Array(buf, off + 46, nLen));
    out.set(nombre, { metodo, comp, loc });
    off += 46 + nLen + eLen + cLen;
  }
  return { buf, dv, entradas: out };
}

async function inflar(z, nombre) {
  const e = z.entradas.get(nombre);
  if (!e) return null;
  if (z.dv.getUint32(e.loc, true) !== SIG_LOC) throw new Error(`Entrada corrupta en la planilla: ${nombre}`);
  // el largo del nombre y del extra del encabezado LOCAL pueden diferir de los del
  // directorio central, así que se leen de acá
  const nLen = z.dv.getUint16(e.loc + 26, true);
  const eLen = z.dv.getUint16(e.loc + 28, true);
  const ini = e.loc + 30 + nLen + eLen;
  const datos = new Uint8Array(z.buf, ini, e.comp);
  if (e.metodo === 0) return new TextDecoder().decode(datos);      // guardado sin comprimir
  if (e.metodo !== 8) throw new Error(`La planilla usa un método de compresión no soportado (${e.metodo}).`);
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Este navegador no puede descomprimir la planilla. Abrila en Excel y pegá el bloque como texto.");
  }
  const ds = new DecompressionStream("deflate-raw");
  const blob = new Response(new Blob([datos]).stream().pipeThrough(ds));
  return new TextDecoder().decode(await blob.arrayBuffer());
}

// ── XML ──────────────────────────────────────────────────────────────────────
//
// Un escáner de etiquetas, no un parser. `DOMParser` no existe fuera del navegador y esto
// tiene que poder probarse; y de SpreadsheetML sólo hacen falta cuatro etiquetas, que
// Excel emite siempre igual porque las genera un programa. Se documenta que es un atajo:
// si algún día hiciera falta leer algo más del formato, esto NO alcanza.
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const desescapar = (s) => String(s).replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (m, e) =>
  e[0] === "#"
    ? String.fromCodePoint(parseInt(e[1] === "x" || e[1] === "X" ? e.slice(2) : e.slice(1), e[1] === "x" || e[1] === "X" ? 16 : 10))
    : (ENT[e] ?? m));

const textoDe = (frag) => [...String(frag).matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
  .map(m => desescapar(m[1])).join("");

function cadenasCompartidas(xml) {
  if (!xml) return [];
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g)]
    .map(m => (m[1] === undefined ? "" : textoDe(m[1])));
}

// "A"→0, "Z"→25, "AA"→26. La columna sale de la referencia de la celda y no de su orden:
// una fila puede saltearse columnas vacías, y contando por orden todo lo de la derecha se
// corre a la izquierda. Es el mismo error que ya costó una fila entera de valores
// desplazados cuando la celda «Referencia» venía combinada.
const iCol = (ref) => {
  let n = 0;
  for (const ch of String(ref).match(/^[A-Z]+/i)?.[0] ?? "A") n = n * 26 + (ch.toUpperCase().charCodeAt(0) - 64);
  return n - 1;
};

function matrizDeHoja(xml, ss) {
  const filas = [];
  for (const rm of String(xml).matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>|<row\b[^>]*\/>/g)) {
    const cuerpo = rm[2] ?? "";
    const celdas = [];
    for (const cm of cuerpo.matchAll(/<c\b([^>]*?)\/>|<c\b([^>]*?)>([\s\S]*?)<\/c>/g)) {
      const attrs = cm[1] ?? cm[2] ?? "";
      const cont = cm[3] ?? "";
      const ref = /r="([^"]+)"/.exec(attrs)?.[1];
      const tipo = /t="([^"]+)"/.exec(attrs)?.[1];
      let val = "";
      if (tipo === "inlineStr") val = textoDe(cont);
      else {
        const v = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(cont)?.[1];
        if (v !== undefined) {
          if (tipo === "s") val = ss[Number(v)] ?? "";
          else {
            // UNA CELDA NUMÉRICA SALE COMO NÚMERO, no como su texto.
            //
            // La planilla ya dice que es un número y guarda su valor exacto; devolverlo
            // como cadena obliga a volver a interpretarlo, y ahí es donde se pierde. Excel
            // escribe los valores chicos en notación científica —un corte de 0,018 queda
            // `1.7999999999999999E-2`— y esa cadena, releída, daba dos números o ninguno.
            // Lo mismo vale para la coma decimal: acá nunca aparece, el XML es siempre
            // punto, así que no hay ambigüedad que resolver.
            const t = desescapar(v);
            const n = Number(t);
            val = (tipo === undefined || tipo === "n") && t.trim() !== "" && Number.isFinite(n) ? n : t;
          }
        }
      }
      const j = ref ? iCol(ref) : celdas.length;
      while (celdas.length < j) celdas.push("");
      celdas[j] = val;
    }
    filas.push(celdas);
  }
  // se emparejan los largos para que todas las filas tengan las mismas columnas: es lo
  // que permite después mapear por posición contra el encabezado
  const an = Math.max(0, ...filas.map(f => f.length));
  return filas.map(f => { const g = [...f]; while (g.length < an) g.push(""); return g; })
    .filter(f => f.some(c => String(c).trim() !== ""));
}

// ── ENTRADA PÚBLICA ──────────────────────────────────────────────────────────

// Nombres de las hojas, en el orden del libro. Sale de `workbook.xml` y no de los nombres
// de archivo: `sheet1.xml` no tiene por qué ser la primera hoja del libro ni llamarse así.
function hojasDe(wb, rels) {
  const mapa = new Map([...String(rels || "").matchAll(/<Relationship\b([^>]*)\/>/g)].map(m => [
    /Id="([^"]+)"/.exec(m[1])?.[1],
    /Target="([^"]+)"/.exec(m[1])?.[1],
  ]));
  return [...String(wb || "").matchAll(/<sheet\b([^>]*?)\/>/g)].map(m => {
    const a = m[1];
    const rid = /r:id="([^"]+)"/.exec(a)?.[1];
    let t = mapa.get(rid) || "";
    if (t && !t.startsWith("/")) t = `xl/${t.replace(/^\.?\//, "")}`;
    return { nombre: desescapar(/name="([^"]+)"/.exec(a)?.[1] ?? ""), ruta: t.replace(/^\//, "") };
  }).filter(h => h.ruta);
}

// Devuelve `{ hojas: [{nombre, matriz}] }`. Se leen TODAS: cuál trae las reacciones lo
// decide quien importa, y adivinarlo —quedarse con la primera— haría fallar en silencio
// justo el caso normal, que es un libro con una hoja de datos y otra de notas.
export async function leerXlsx(entrada) {
  const buf = entrada instanceof ArrayBuffer ? entrada
    : entrada?.arrayBuffer ? await entrada.arrayBuffer()
    : entrada?.buffer instanceof ArrayBuffer ? entrada.buffer
    : null;
  if (!buf) throw new Error("No se pudo leer el archivo.");
  const z = entradasZip(buf);
  const ss = cadenasCompartidas(await inflar(z, "xl/sharedStrings.xml"));
  const hojas = hojasDe(await inflar(z, "xl/workbook.xml"), await inflar(z, "xl/_rels/workbook.xml.rels"));
  const lista = hojas.length ? hojas
    : [...z.entradas.keys()].filter(k => /^xl\/worksheets\/.*\.xml$/.test(k)).sort()
      .map((ruta, i) => ({ nombre: `Hoja ${i + 1}`, ruta }));
  const out = [];
  for (const h of lista) {
    const xml = await inflar(z, h.ruta);
    if (xml) out.push({ nombre: h.nombre, matriz: matrizDeHoja(xml, ss) });
  }
  if (!out.length) throw new Error("La planilla no tiene ninguna hoja con datos.");
  return { hojas: out };
}

// ── CSV ──────────────────────────────────────────────────────────────────────
//
// Va acá y no aparte porque es la MISMA operación desde el punto de vista de quien
// importa: elegir un archivo y que aparezca la tabla. Además es la salida cuando la
// planilla no se puede leer —«guardala como CSV»— así que conviene que exista.
//
// Se detecta el separador contando cuál aparece más en las primeras líneas: en Argentina
// Excel exporta con punto y coma, porque la coma es el separador decimal.
export function leerCsv(txt) {
  const t = String(txt || "").replace(/^﻿/, "");
  const muestra = t.split(/\r?\n/).slice(0, 10).join("\n");
  const sep = [";", "\t", ","]
    .map(s => [s, (muestra.match(new RegExp(`\\${s}`, "g")) || []).length])
    .sort((a, b) => b[1] - a[1])[0][0];

  const filas = [];
  let fila = [], cel = "", entre = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (entre) {
      if (ch === '"') { if (t[i + 1] === '"') { cel += '"'; i++; } else entre = false; }
      else cel += ch;
    } else if (ch === '"') entre = true;
    else if (ch === sep) { fila.push(cel); cel = ""; }
    else if (ch === "\n") { fila.push(cel); filas.push(fila); fila = []; cel = ""; }
    else if (ch !== "\r") cel += ch;
  }
  if (cel !== "" || fila.length) { fila.push(cel); filas.push(fila); }
  const an = Math.max(0, ...filas.map(f => f.length));
  return filas.map(f => { const g = f.map(c => c.trim()); while (g.length < an) g.push(""); return g; })
    .filter(f => f.some(c => c !== ""));
}

// Un archivo, sea planilla o CSV. Devuelve siempre `{ hojas: [{nombre, matriz}] }`.
export async function leerPlanilla(file) {
  const nombre = String(file?.name || "");
  if (/\.(csv|txt|tsv)$/i.test(nombre)) {
    return { hojas: [{ nombre, matriz: leerCsv(await file.text()) }] };
  }
  if (/\.xls$/i.test(nombre)) {
    throw new Error("El formato .xls viejo no se puede leer. Guardala como .xlsx o como CSV.");
  }
  return leerXlsx(file);
}
