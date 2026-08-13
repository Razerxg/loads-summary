// ESTILOS DERIVADOS DE LOS TOKENS.
//
// Este archivo mantiene EXACTAMENTE las mismas claves que antes (`s.card`, `s.inp`,
// `s.th`…) porque las usan las doce pestañas: cambiarles el nombre habría obligado a
// tocar todos los archivos de una sola vez, sin poder probar en local. Lo que cambia
// son los VALORES, ahora derivados de `tokens.js`. Así el rediseño se propaga solo a
// toda la app y cada pestaña se puede ir refinando después, de a una.
//
// `C` sigue exportándose con los nombres viejos (`C.panel`, `C.accentL`, `C.green`…)
// mapeados a la paleta nueva: los croquis SVG los usan por todos lados.
import { c, t, sp, SP, R, SOMBRA, TRANS, MONO, SANS, TAM, FUENTE } from './tokens.js';

// Compatibilidad: nombres viejos → paleta nueva. No agregar claves acá; para color
// nuevo, usar `c` de tokens.js directamente.
const C = {
  bg: c.canvas, surface: c.surface, panel: c.raised, border: c.border,
  accent: c.azul, accentL: c.azulL, green: c.verde, red: c.rojo,
  text: c.txt, muted: c.txt2, label: c.txt3, yellow: c.ambar, cyan: c.azulL,
  // Tintes de fondo. Antes se armaban concatenando opacidad al color (`C.green + "22"`);
  // desde que los colores son variables CSS eso no se puede —`var(--x)22` no es nada— y
  // tenerlos nombrados centraliza la decisión en vez de repetir el "+ 22" por ahí.
  accentBg: c.azulBg2, greenBg: c.verdeBg, redBg: c.rojoBg, yellowBg: c.ambarBg,
  mapaMal: c.mapaMal, mapaJusto: c.mapaJusto, mapaBien: c.mapaBien,
};

const s = {
  root: { minHeight: "100vh", background: c.canvas, color: c.txt, fontFamily: FUENTE,
    fontSize: TAM.base, WebkitFontSmoothing: "antialiased" },

  // ── barra superior y pestañas (las conserva el shell clásico; el shell nuevo
  //    usa los componentes de components/shell/) ──
  header: { background: c.surface, borderBottom: `1px solid ${c.border}`, padding: `${SP.sm}px ${SP.lg}px`,
    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: SP.sm },
  title: { ...t.h2 },
  sub: { ...t.micro, marginTop: 2 },
  tabs: { display: "flex", borderBottom: `1px solid ${c.border}`, background: c.surface, overflowX: "auto", alignItems: "stretch" },
  grupo: { display: "flex", flexDirection: "column", borderRight: `1px solid ${c.border}`, paddingBottom: 2 },
  grupoT: { ...t.eyebrow, padding: "6px 16px 0", whiteSpace: "nowrap", minHeight: 14 },
  tab: { padding: "8px 16px 9px", cursor: "pointer", borderBottom: "2px solid transparent",
    fontSize: TAM.base, fontWeight: 500, color: c.txt2, whiteSpace: "nowrap", transition: `color ${TRANS}` },
  tabA: { color: c.txt, borderBottomColor: c.azul },

  body: { padding: `${SP.lg}px ${SP.md}px`, maxWidth: 1240, margin: "0 auto", overflowX: "hidden" },

  // ── tarjetas ──
  // Más aire adentro y más separación afuera: era el reclamo principal. El padding
  // pasó de 12/14 a 20, y el margen inferior de 12 a 16.
  card: { background: c.raised, border: `1px solid ${c.border}`, borderRadius: R.lg,
    padding: SP.lg - 4, marginBottom: SP.md, minWidth: 0, maxWidth: "100%", overflow: "hidden",
    boxShadow: SOMBRA.card },
  // El título de tarjeta ya NO lleva línea divisoria: con una tarjeta de borde propio,
  // la línea era un segundo borde a 10 px del primero y hacía ruido.
  cardT: { ...t.h2, marginBottom: SP.md, display: "flex", alignItems: "center", gap: SP.sm },
  subT: { ...t.eyebrow, margin: `${SP.md}px 0 ${SP.sm}px` },

  // ── filas de formulario ──
  // Etiqueta a la IZQUIERDA y alineada a la izquierda. Estaban alineadas a la derecha
  // contra el campo, que es legible en una lista corta y se vuelve ilegible en veinte.
  row: { display: "flex", alignItems: "center", marginBottom: SP.sm + 2, gap: SP.sm },
  lbl: { ...t.body, color: c.txt2, flex: "1 1 170px", maxWidth: 240, textAlign: "left" },
  inp: { background: c.surface, border: `1px solid ${c.borderFuerte ?? c.border}`, color: c.txt,
    borderRadius: R.sm + 2, padding: "6px 10px", fontSize: TAM.base, width: 104,
    fontFamily: MONO, fontVariantNumeric: "tabular-nums", transition: `border-color ${TRANS}, box-shadow ${TRANS}` },
  sel: { background: c.surface, border: `1px solid ${c.border}`, color: c.txt,
    borderRadius: R.sm + 2, padding: "6px 8px", fontSize: TAM.base, transition: `border-color ${TRANS}` },
  unit: { ...t.micro, minWidth: 44, whiteSpace: "nowrap", flexShrink: 0 },
  out: { ...t.num, color: c.azulL },

  // ── tablas ──
  table: { width: "100%", borderCollapse: "collapse", fontSize: TAM.base },
  // El encabezado de tabla NO va en versalitas espaciadas. Con un solo cuerpo de 13 px,
  // las mayúsculas más el letter-spacing ensanchaban cada columna lo suficiente como
  // para empujar la última fuera de la tarjeta. Se distingue por peso y color, que es
  // lo mismo que hace la versalita pero sin costar ancho.
  th: { padding: "8px 10px", textAlign: "center", fontSize: TAM.base, fontWeight: 600,
    color: c.txt3, borderBottom: `1px solid ${c.border}`, background: c.surface,
    whiteSpace: "nowrap" },
  td: { padding: "7px 10px", borderBottom: `1px solid ${c.border}`, textAlign: "right",
    fontFamily: MONO, fontVariantNumeric: "tabular-nums", fontSize: TAM.base },
  tdL: { padding: "7px 10px", borderBottom: `1px solid ${c.border}`, textAlign: "left", fontSize: TAM.base },

  // ── botones ──
  // Jerarquía explícita: `btn` es EL primario (uno por pantalla), `btnG` el secundario,
  // `btnR` la acción destructiva. Ver también `Boton` en ui.jsx.
  btn: { background: c.azul, color: "#fff", border: "1px solid transparent", borderRadius: R.sm + 2,
    padding: "7px 14px", cursor: "pointer", fontSize: TAM.base, fontWeight: 550, fontFamily: SANS,
    transition: `background ${TRANS}, box-shadow ${TRANS}` },
  btnG: { background: c.overlay, color: c.txt, border: `1px solid ${c.border}`, borderRadius: R.sm + 2,
    padding: "6px 12px", cursor: "pointer", fontSize: TAM.base, fontWeight: 500, fontFamily: SANS,
    transition: `background ${TRANS}, border-color ${TRANS}` },
  btnR: { background: "transparent", color: c.rojo, border: "none", cursor: "pointer",
    fontSize: TAM.base, padding: "4px 8px", borderRadius: R.sm, transition: `background ${TRANS}` },

  note: { ...t.body, color: c.txt3, marginTop: SP.sm + 2, lineHeight: 1.6, fontStyle: "normal" },
  badge: { display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px",
    borderRadius: R.full, fontSize: TAM.base, fontWeight: 600, fontFamily: SANS, letterSpacing: "0.02em" },
};

export { C, MONO, s, c, t, sp, SP, R, SOMBRA, TRANS, SANS, TAM, FUENTE };
