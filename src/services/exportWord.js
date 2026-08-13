// LLEVAR LA MEMORIA A WORD — por portapapeles y por archivo.
//
// Portado de `bases-v-0.1`, SIN la parte de rasterizar croquis: esta app no dibuja nada, así
// que todo el bloque de SVG → PNG sobraba. Dejar código muerto con comentarios elaborados
// sobre una función que no existe es peor que no tenerlo.
//
// ── POR QUÉ HTML Y NO .DOCX REAL ────────────────────────────────────────────────
//
// Word abre HTML de forma nativa y deja seguir editando con el texto, las tablas y los
// estilos vivos. Generar OOXML de verdad obligaría a reconstruir el documento entero con
// primitivas de una librería, duplicando las líneas de la memoria y condenándolas a divergir
// en cada cambio. Acá lo que sale es LITERALMENTE lo que está en pantalla.
//
// ── EL PORTAPAPELES ES EL CAMINO PRINCIPAL ──────────────────────────────────────
//
// El pedido concreto fue «copiarlas y pegarlas en un Word», no «bajar un archivo». Pegar es
// mejor para eso: la tabla entra donde está el cursor, dentro del documento que ya existe,
// con su formato. Bajar un `.doc` obliga a abrirlo aparte, copiar de ahí y volver.
//
// Se escribe `text/html` Y `text/plain` en el mismo evento: Word toma el HTML, y cualquier
// destino que no lo entienda —un mail en texto plano, un chat— recibe una versión legible en
// vez de nada.

const ESTILO = `
@page { size: 21cm 29.7cm; margin: 2cm 2cm 2cm 2.5cm; }
body { font-family: Arial, sans-serif; font-size: 10.5pt; color: #111; }
h1, h2, h3, h4 { font-family: Arial, sans-serif; color: #111; }
table { border-collapse: collapse; width: 100%; }
td, th { font-size: 8.5pt; }
/* que Word no parta una tabla entre páginas si puede evitarlo */
table { page-break-inside: avoid; }
`;

const ENVOLTORIO = (titulo, cuerpo) => `<html xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${titulo}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>${ESTILO}</style></head><body>${cuerpo}</body></html>`;

// Los `<div>` en negrita que hacen de encabezado se promueven a `<h1>`/`<h2>`/`<h3>`. No es
// cosmético: es lo que hace que Word arme el panel de navegación y pueda generar un índice
// automático. Sin esto, la memoria llega como un bloque plano de párrafos.
function promoverEncabezados(raiz) {
  raiz.querySelectorAll("div").forEach(d => {
    const fs = parseFloat(d.style.fontSize || "0");
    const bold = String(d.style.fontWeight) === "700";
    if (!bold || d.children.length > 0) return;
    let nivel = 0;
    if (fs >= 15.5) nivel = 1;
    else if (fs >= 13 && d.style.borderBottom) nivel = 2;
    else if (fs >= 12 && fs < 13) nivel = 3;
    if (!nivel) return;
    const h = document.createElement("h" + nivel);
    h.textContent = d.textContent;
    h.setAttribute("style", d.getAttribute("style") || "");
    d.replaceWith(h);
  });
}

// Prepara un nodo del documento para salir: se clona, se le sacan los controles de la app y
// se le quitan las medidas de pantalla.
//
// ⚠ LOS BOTONES DE COPIAR TIENEN QUE DESAPARECER. Viven dentro de la memoria —al lado del
// título de cada tabla, que es donde sirven— así que sin este barrido se copiarían al Word
// como texto suelto «copiar» encima de cada tabla.
export function prepararNodo(nodo) {
  const clon = nodo.cloneNode(true);
  clon.querySelectorAll(".bx-nocopy").forEach(n => n.remove());
  promoverEncabezados(clon);
  clon.style.maxWidth = "none";
  clon.style.padding = "0";
  clon.style.borderRadius = "0";
  clon.style.boxShadow = "none";
  return clon;
}

export const htmlDe = (nodo, titulo = "memoria") =>
  ENVOLTORIO(titulo, prepararNodo(nodo).outerHTML);

// ── COPIAR AL PORTAPAPELES ──────────────────────────────────────────────────────
//
// Devuelve `{ ok, motivo }` en vez de tirar: el llamador muestra un toast, y un fallo del
// portapapeles no tiene por qué romper la pantalla. Los motivos habituales son permiso
// denegado o página servida sin HTTPS, y los dos son del entorno y no de la app.
export async function copiarNodo(nodo) {
  if (!nodo) return { ok: false, motivo: "no hay nada que copiar" };
  const clon = prepararNodo(nodo);
  const html = clon.outerHTML;
  const texto = clon.innerText;
  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([texto], { type: "text/plain" }),
      })]);
      return { ok: true };
    }
  } catch { /* se prueba el camino viejo */ }
  // CAMINO DE RESPALDO para navegadores sin `ClipboardItem` o con el permiso denegado: se
  // selecciona el nodo REAL y se ejecuta el copiado del documento. Es la API vieja, pero es
  // la única que conserva el formato sin pedir permiso.
  try {
    const sel = window.getSelection();
    const previo = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    const tmp = document.createElement("div");
    // fuera de la vista pero DENTRO del documento: la selección no funciona sobre un nodo
    // que no está montado, y `display:none` tampoco es seleccionable
    tmp.style.cssText = "position:fixed;left:-99999px;top:0;white-space:normal";
    tmp.appendChild(clon);
    document.body.appendChild(tmp);
    const r = document.createRange();
    r.selectNodeContents(tmp);
    sel.removeAllRanges();
    sel.addRange(r);
    const ok = document.execCommand("copy");
    sel.removeAllRanges();
    if (previo) sel.addRange(previo);
    tmp.remove();
    return ok ? { ok: true } : { ok: false, motivo: "el navegador rechazó el copiado" };
  } catch (e) {
    return { ok: false, motivo: String(e?.message || e) };
  }
}

// ── BAJAR EL .DOC ───────────────────────────────────────────────────────────────
export function exportarWord(nodo, nombre = "memoria") {
  if (!nodo) throw new Error("no hay documento para exportar");
  const blob = new Blob(["﻿", htmlDe(nodo, nombre)], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre.replace(/[^\w\-]+/g, "_")}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
