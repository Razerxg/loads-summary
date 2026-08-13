// EXPORTAR LAS TABLAS A CSV.
//
// Estos números no terminan acá: van a una memoria de cálculo, a una planilla de
// dimensionamiento, a la app de bases. Tener que retipearlos desde la pantalla sería
// reintroducir exactamente el error que el importador viene a evitar del otro lado.
//
// ── DOS DECISIONES DE FORMATO, y las dos son para Excel en español ────────────────
//
//  · **SEPARADOR PUNTO Y COMA.** Con coma decimal, la coma no puede separar columnas: un
//    `12,40` se partiría en dos celdas. Excel en configuración regional española espera
//    justamente `;`, así que el archivo abre de doble clic sin pasar por el asistente.
//  · **COMA DECIMAL.** Es lo que espera esa misma configuración regional. Un archivo con
//    punto decimal abre con todos los valores convertidos en texto —o peor, en fechas— y
//    hay que rehacerlo a mano.
//
// Se agrega el BOM UTF-8 porque sin él Excel lee el archivo en la página de códigos local y
// los acentos y el `·` de las unidades salen rotos.
const BOM = "﻿";
const SEP = ";";

// Un valor de celda. Los números van con coma decimal y SIN separador de miles: el separador
// de miles vuelve a introducir un carácter ambiguo en un archivo delimitado.
export function celdaCsv(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") {
    if (!isFinite(v)) return "";
    return String(v).replace(".", ",");
  }
  const t = String(v);
  // Se entrecomilla si trae el separador, comillas o un salto de línea. Las comillas
  // internas se duplican, que es como manda el formato.
  return /[";\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export const filasACsv = (filas) =>
  BOM + filas.map(f => f.map(celdaCsv).join(SEP)).join("\r\n") + "\r\n";

export function descargar(nombre, texto) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
  a.download = nombre;
  a.click();
  // Sin esto, el objeto queda retenido hasta que se cierra la pestaña. Con varias
  // exportaciones seguidas —que es el uso normal, un CSV por nivel— se van acumulando.
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ── LAS TABLAS DE LA APP ────────────────────────────────────────────────────────
//
// Se exporta lo que se está mirando, con el ENCABEZADO QUE DICE EN QUÉ CONDICIONES está
// calculado: nudo, nivel, profundidad y criterio de signos. Un CSV de momentos trasladados
// sin esos cuatro datos al lado no se puede revisar ni seis meses después ni por otra
// persona, y esta app existe justamente para que esos números viajen.
export function csvDeNivel({ proyecto, nudo, nivel, modo, comps, hipotesis, elu, els, envELU, envELS }) {
  const F = [];
  F.push(["Reacciones por hipótesis y combinaciones"]);
  if (proyecto) F.push(["Proyecto", proyecto]);
  F.push(["Nudo", nudo]);
  F.push(["Nivel", nivel.nombre, "h (m)", nivel.h]);
  F.push(["Criterio de traslado", modo]);
  F.push([]);

  const cab = (titulo) => [titulo, ...comps.map(c => `${c.rot} (${c.uni})`)];

  F.push(["ESFUERZOS POR HIPÓTESIS"]);
  F.push(cab("Hipótesis"));
  for (const h of hipotesis) F.push([h.hip, ...comps.map(c => h.esf[c.k])]);
  F.push([]);

  for (const [titulo, filas, env] of [["ELU", elu, envELU], ["ELS", els, envELS]]) {
    F.push([`COMBINACIONES ${titulo}`]);
    F.push([...cab("Combinación"), "Expresión"]);
    for (const f of filas) F.push([f.nombre, ...comps.map(c => f.esf[c.k]), f.expr]);
    F.push(["Máximo", ...comps.map(c => env[c.k].max.v), comps.map(c => `${c.rot}: ${env[c.k].max.en}`).join(" · ")]);
    F.push(["Mínimo", ...comps.map(c => env[c.k].min.v), comps.map(c => `${c.rot}: ${env[c.k].min.en}`).join(" · ")]);
    F.push([]);
  }
  return filasACsv(F);
}
