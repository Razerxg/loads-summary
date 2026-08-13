// TOKENS DE DISEÑO — fuente única de medidas, colores y tipografía.
//
// Antes cada componente elegía su propio tamaño de letra y su propio padding a ojo, y
// terminó habiendo nueve tamaños entre 8 y 15 px. El resultado es que todo pesaba
// visualmente lo mismo: no había forma de saber, mirando, qué era un título, qué era un
// dato y qué era una nota al pie. Estos tokens existen para que esa decisión se tome
// UNA vez y no en cada archivo.
//
// Nada de acá toca el motor de cálculo. Es presentación.

// ── ESPACIADO ────────────────────────────────────────────────────────────────────
// Grilla de 8 px. `sp(1)` = 8. Los medios pasos (4 px) existen sólo para separar cosas
// que pertenecen al mismo objeto (un valor y su unidad); todo lo demás va en múltiplos
// enteros, que es lo que hace que la página se lea alineada aunque nadie la mida.
export const sp = (n) => n * 8;
export const SP = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

// ── COLOR ────────────────────────────────────────────────────────────────────────
// Superficies por ELEVACIÓN, no por nombre de lugar: `canvas` es el fondo de la
// aplicación, `surface` lo que se apoya encima (barras), `raised` las tarjetas y
// `overlay` lo que flota (popovers). Ordenadas de más oscuro a más claro, así que la
// jerarquía de profundidad se lee sola.
// LOS COLORES SON VARIABLES CSS, NO LITERALES.
//
// `c.canvas` no vale "#0A0B0D" sino "var(--bx-canvas)". El valor concreto lo pone el
// atributo `data-tema` del elemento raíz, y por eso cambiar de tema es cambiar UN
// atributo: no hay que re-renderizar nada ni pasar la paleta por contexto a cincuenta
// componentes que hoy la importan directo. Los estilos en línea siguen escribiéndose
// igual —`background: c.raised`— y el navegador resuelve la variable al pintar.
//
// CONSECUENCIA A TENER PRESENTE: **no se puede concatenar opacidad**. `c.verde + "40"`
// producía `#6E9B7940`, pero `var(--bx-verde)40` no es nada. Por eso cada tinte y cada
// borde translúcido tiene AHORA SU PROPIO TOKEN (`verdeBg`, `verdeBd`, `azulBg2`…), que
// además es lo correcto: centraliza la decisión en vez de repetir "+ 40" por ahí.
//
// Los croquis que van al REPORTE no usan estos tokens: reciben `light` y llevan sus
// colores en hexadecimal literal. Es a propósito —la memoria se imprime siempre igual—
// y encima los deja a salvo de la exportación a Word, que serializa el SVG fuera del
// documento, donde una variable CSS no resolvería.

const OSCURO = {
  canvas: "#0A0B0D",
  surface: "#0F1114",
  raised: "#15181C",
  overlay: "#1B1F24",
  hover: "#1E2228",

  border: "#23272E",
  borderFuerte: "#31363F",

  // Tres niveles de texto y NO más. Si algo necesita un cuarto nivel, casi siempre lo
  // que necesita en realidad es no estar ahí.
  txt: "#EAECEF",
  txt2: "#9BA3AE",
  txt3: "#6B7280",

  // SEMÁNTICA — DESATURADA a propósito.
  //
  // Los tonos anteriores eran los saturados de una paleta de producto web (#3B82F6,
  // #22C55E, #EF4444). Sobre fondo oscuro vibran, tiran de la vista antes que el número
  // que acompañan y le dan a una herramienta de cálculo el aire de una app de consumo.
  // Estos están bajados en saturación y subidos en gris: siguen distinguiéndose entre
  // sí y siguen leyéndose sobre el fondo, pero no compiten con el contenido.
  //
  // El color es SEÑAL, no decoración. Si un elemento no comunica un estado, va en gris.
  azul: "#5E85AD",      // acción principal, foco, selección
  azulL: "#7FA3C4",
  verde: "#6E9B79",     // verifica
  ambar: "#AE8F55",     // advertencia: no invalida, pero hay que mirarlo
  rojo: "#B96B63",      // no verifica / error de definición
  violeta: "#8A82A8",   // datos derivados, sin connotación de bien/mal

  // Tintes y bordes de estado. Antes salían de concatenar opacidad al color; con
  // variables CSS eso no se puede, y tenerlos declarados es además más claro.
  azulBg: "#5E85AD14", azulBd: "#5E85AD40", azulBg2: "#5E85AD22",
  verdeBg: "#6E9B7914", verdeBd: "#6E9B7940",
  ambarBg: "#AE8F5514", ambarBd: "#AE8F5540",
  rojoBg: "#B96B6314", rojoBd: "#B96B6340",
  // gradiente del what-if: de "no verifica" a "sobra margen"
  mapaMal: "#B96B6333", mapaJusto: "#AE8F5522", mapaBien: "#6E9B7918",

  sombraCard: "0 1px 2px rgba(0,0,0,.35)",
  sombraPop: "0 8px 24px rgba(0,0,0,.5)",
};

// TEMA CLARO. No es el oscuro con los grises dados vuelta y nada más.
//
//  · Las superficies van al revés en ORDEN: en oscuro la tarjeta es MÁS CLARA que el
//    fondo (se acerca a la luz); en claro tiene que ser MÁS BLANCA que un fondo
//    levemente gris. Un blanco puro de fondo con tarjetas blancas borra la jerarquía.
//  · Los colores semánticos se OSCURECEN y suben algo de saturación: los tonos que
//    funcionan sobre negro quedan lavados sobre blanco y no llegan a contrastar lo
//    suficiente para leerse en texto chico.
//  · Los tintes de estado suben de 8 % a ~12 % de opacidad: sobre blanco, un 8 % no se
//    ve. Los bordes también.
const CLARO = {
  canvas: "#F2F3F5",
  surface: "#FFFFFF",
  raised: "#FFFFFF",
  overlay: "#FFFFFF",
  hover: "#EDEFF2",

  border: "#DCE0E6",
  borderFuerte: "#C2C8D0",

  txt: "#1A1D21",
  txt2: "#4E5560",
  txt3: "#767E8A",

  azul: "#2F5F8C",
  azulL: "#3C7AB0",
  verde: "#3F7A50",
  ambar: "#8A6714",
  rojo: "#A4382E",
  violeta: "#5F5688",

  azulBg: "#2F5F8C14", azulBd: "#2F5F8C4D", azulBg2: "#2F5F8C1F",
  verdeBg: "#3F7A5014", verdeBd: "#3F7A504D",
  ambarBg: "#8A671414", ambarBd: "#8A67144D",
  rojoBg: "#A4382E14", rojoBd: "#A4382E4D",
  mapaMal: "#A4382E33", mapaJusto: "#8A671422", mapaBien: "#3F7A5018",

  // En claro la sombra tiene que ser MUCHO más suave: la misma opacidad que sobre negro
  // se ve como una mancha sucia alrededor de cada tarjeta.
  sombraCard: "0 1px 2px rgba(16,24,40,.06)",
  sombraPop: "0 8px 24px rgba(16,24,40,.14)",
};

export const TEMAS = { oscuro: OSCURO, claro: CLARO };
export const TEMA_DEF = "oscuro";

// `c.<clave>` → `var(--bx-<clave>)`. Se deriva de las claves del tema oscuro, así que
// agregar un color es agregarlo a LOS DOS mapas: si falta en uno, la variable queda sin
// valor y se nota enseguida en pantalla.
export const c = Object.fromEntries(
  Object.keys(OSCURO).map(k => [k, `var(--bx-${k})`]));

// Bloque CSS con los dos juegos de valores. El oscuro va en `:root` —es el de siempre—
// y el claro se activa con `data-tema="claro"` en el elemento raíz.
export const cssTemas = () => {
  const vars = (m) => Object.entries(m).map(([k, v]) => `--bx-${k}:${v}`).join(";");
  return `:root{${vars(OSCURO)};color-scheme:dark}\n`
    + `:root[data-tema="claro"]{${vars(CLARO)};color-scheme:light}`;
};

// Un tono = color de texto + fondo + borde coherentes entre sí. Se usa en badges,
// tarjetas de verificación y bordes de estado; centralizarlo evita que cada lugar
// invente su propio verde.
//
// Los fondos son muy tenues y los bordes discretos: la tarjeta de una verificación que
// falla tiene que distinguirse de una que pasa, no gritar. Los valores concretos los
// pone cada tema —sobre blanco un 8 % de opacidad no se ve, así que el claro los sube—.
export const TONO = {
  ok:    { fg: c.verde,  bg: c.verdeBg, bd: c.verdeBd },
  aviso: { fg: c.ambar,  bg: c.ambarBg, bd: c.ambarBd },
  error: { fg: c.rojo,   bg: c.rojoBg,  bd: c.rojoBd },
  info:  { fg: c.azulL,  bg: c.azulBg,  bd: c.azulBd },
  neutro:{ fg: c.txt2,   bg: c.overlay, bd: c.border },
};

// ── TIPOGRAFÍA ───────────────────────────────────────────────────────────────────
//
// UNA SOLA FAMILIA en toda la aplicación. Antes convivían dos —una sans para el texto y
// una monoespaciada para los números y las fórmulas— y se notaba: dos formas de dibujar
// la misma cifra en la misma tarjeta hacen que la pantalla parezca ensamblada con
// pedazos de aplicaciones distintas, que es exactamente lo que se veía.
//
// Es la fuente del SISTEMA: San Francisco en Mac y iOS, Segoe UI en Windows, Roboto en
// Android y ChromeOS. Todas son sans-serif sobrias y de la misma escuela, así que el
// resultado es coherente en cualquier máquina. No se descarga nada: no hay petición de
// red, no hay parpadeo al cargar, y la fuente existe también cuando la memoria se
// exporta a Word o cuando se rasteriza un croquis.
export const FUENTE = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', "
  + "'Segoe UI Variable Text', 'Segoe UI', Roboto, 'Open Sans', 'Helvetica Neue', Arial, sans-serif";

// Alias de compatibilidad. Medio centenar de lugares pedían `MONO` para los números;
// ahora apuntan a la MISMA familia, así que la unificación se propaga sola sin tocar
// cincuenta archivos. Lo que daba la alineación de columnas no era la fuente
// monoespaciada sino `font-variant-numeric: tabular-nums`, que se conserva en `t.num`.
export const SANS = FUENTE;
export const MONO = FUENTE;

// TRES TAMAÑOS. Nada más. El salto grande es lo que crea la jerarquía: 22 → 15 → 13 se
// distingue de un vistazo; 13 → 12,5 → 11,5 no se distingue nunca, y era lo que había.
//
// Lo que antes se resolvía achicando la letra —unidades, rótulos de sección, encabezados
// de tabla— ahora se resuelve con PESO y COLOR sobre el mismo cuerpo de 13. Es más
// trabajo de diseño y bastante más legible: una unidad en gris al 400 se lee como
// secundaria sin necesidad de medir 11 px.
// 18 y no 22 para el tamaño grande: a 22 px el título de pantalla y los valores
// destacados dominaban la página como si fueran el titular de una web. En una
// herramienta de cálculo lo importante es la densidad de datos legible, no el impacto:
// 18 alcanza de sobra para separar el título del resto, y deja de gritar.
export const TAM = { grande: 18, medio: 15, base: 13 };

export const t = {
  h1:    { fontSize: TAM.grande, fontWeight: 650, letterSpacing: "-0.02em", lineHeight: 1.25, color: c.txt },
  h2:    { fontSize: TAM.medio, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.35, color: c.txt },
  body:  { fontSize: TAM.base, fontWeight: 400, lineHeight: 1.6, color: c.txt2 },
  bodyF: { fontSize: TAM.base, fontWeight: 500, lineHeight: 1.6, color: c.txt },
  // Los números llevan cifras de ANCHO FIJO. Es lo único que hacía falta de la fuente
  // monoespaciada: en una columna de resultados, que el 1 mida menos que el 8 desalinea
  // la coma decimal y la columna deja de poder recorrerse con la vista.
  num:   { fontSize: TAM.base, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: c.txt },
  // Los valores destacados van en el color de texto NORMAL, no en el del estado. El
  // verde y el rojo quedan para el símbolo y la etiqueta de estado, que es donde
  // significan algo; un número pintado de verde no aporta información que el ✓ no dé ya,
  // y multiplicado por veinte tiñe la pantalla entera.
  numG:  { fontSize: TAM.grande, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", color: c.txt },
  // secundario: mismo cuerpo, menos peso y menos contraste
  micro: { fontSize: TAM.base, fontWeight: 400, color: c.txt3 },
  // rótulo de sección: versalitas espaciadas, para que ordene sin competir con los títulos
  eyebrow: { fontSize: TAM.base, fontWeight: 600, color: c.txt3, textTransform: "uppercase", letterSpacing: "0.06em" },
};

// ── FORMA Y PROFUNDIDAD ──────────────────────────────────────────────────────────
export const R = { sm: 4, md: 8, lg: 12, full: 999 };
export const SOMBRA = {
  card: c.sombraCard,
  pop: `${c.sombraPop}, 0 0 0 1px ${c.border}`,
  foco: `0 0 0 3px ${c.azulBd}`,
};

// Una sola duración y una sola curva para todo: microinteracciones que tardan distinto
// se sienten como partes de aplicaciones distintas.
export const TRANS = "140ms cubic-bezier(.2,.6,.35,1)";

// Ancho máximo del contenido. Optimizado para NOTEBOOK de 1366 px, que es donde se usa
// esto: con la barra lateral y los márgenes, quedan ~1080 px de contenido útil.
export const ANCHO_CONTENIDO = 1120;
// Con un solo cuerpo de 13 px, los rótulos de grupo («Herramientas avanzadas») ya no
// entran en 208 px y partían en dos líneas.
export const ANCHO_SIDEBAR = 232;
export const ANCHO_PANEL = 260;
