import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { C, MONO, s } from './styles.js';
import { c, t, SP, R, TONO, SOMBRA, TRANS, TAM } from './tokens.js';
import { f3 } from '../engine/utils.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVAS DE FORMULARIO
// ═══════════════════════════════════════════════════════════════════════════════

// `ayuda` reemplaza los párrafos explicativos que había debajo de cada bloque: el que
// ya sabe qué es el campo no lee nada, y el que no sabe lo tiene a un hover.
export function Field({ label, unit, ayuda, children }) {
  return (
    <div style={s.row}>
      <span style={s.lbl}>{label}{ayuda && <Ayuda>{ayuda}</Ayuda>}</span>
      {children}
      <span style={s.unit}>{unit}</span>
    </div>
  );
}
export function Num({ v, set, w = 104, ph }) {
  return <input className="bx-in" style={{ ...s.inp, width: w }} type="number" step="any"
    value={v} placeholder={ph} onChange={e => set(e.target.value)} />;
}
export function Out({ label, v, unit, fmt = f3, ayuda }) {
  return (
    <div style={s.row}>
      <span style={s.lbl}>{label}{ayuda && <Ayuda>{ayuda}</Ayuda>}</span>
      <span style={s.out}>{fmt(v)}</span>
      <span style={s.unit}>{unit}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AYUDA CONTEXTUAL
// ═══════════════════════════════════════════════════════════════════════════════

// EL PANEL FLOTANTE SE RENDERIZA EN `document.body`, NO JUNTO AL ÍCONO.
//
// La versión anterior era CSS puro: un `position:absolute` dentro del `.bx-tip`. Se
// veía bien en los casos cortos y fallaba en todos los demás, por tres motivos que se
// suman:
//  · **LO RECORTABA EL CONTENEDOR.** Media interfaz vive dentro de tarjetas y de
//    envoltorios con `overflow:auto` —las grillas de cargas, las tablas de
//    combinaciones, los acordeones—, y un absolute no puede salirse de un ancestro que
//    recorta. La ayuda quedaba cortada por el borde del recuadro.
//  · **SIEMPRE ABRÍA HACIA ARRIBA.** Con el ícono cerca del techo de la ventana, el
//    texto se iba fuera de la pantalla.
//  · **NO TENÍA TOPE DE ALTO.** Las ayudas largas —las del importador ocupan varios
//    párrafos— se estiraban más que la ventana y no había forma de leer el final.
//
// Con portal a `body` y `position:fixed` el panel deja de depender de dónde esté el
// ícono en el árbol: se posiciona contra la ventana, se voltea arriba/abajo según
// dónde haya lugar, se acota a los bordes y, si aun así no entra, ACOTA SU ALTO y
// scrollea adentro en vez de cortarse.
//
// Se abre con hover, con foco de teclado y con CLIC. El clic no es un lujo: en un
// teléfono no hay hover, y hasta ahora estas ayudas eran directamente inalcanzables.
const MARGEN = 8;          // aire mínimo contra los bordes de la ventana
const ANCHO_MAX = 340;

function Flotante({ children, anchoMax = ANCHO_MAX, contenido }) {
  const refAncla = useRef(null);
  const refPanel = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [fijo, setFijo] = useState(false);      // abierto por clic: no lo cierra el mouse
  const [pos, setPos] = useState(null);
  const cierre = useRef(null);

  // El cierre por mouse va DIFERIDO. Entre el ícono y el panel hay 8 px de aire, y sin
  // esta demora el panel se cerraba justo cuando el usuario iba a entrar en él —que es
  // lo que hay que hacer para scrollear una ayuda larga—.
  const cancelarCierre = () => { clearTimeout(cierre.current); cierre.current = null; };
  const cerrarLuego = () => {
    if (fijo) return;
    cancelarCierre();
    cierre.current = setTimeout(() => { setAbierto(false); setFijo(false); }, 140);
  };
  const abrir = () => { cancelarCierre(); setAbierto(true); };
  useEffect(() => cancelarCierre, []);

  // Se mide DESPUÉS de pintar el panel (layout effect sería ideal, pero un efecto
  // normal alcanza porque arranca invisible hasta tener posición).
  useEffect(() => {
    if (!abierto) { setPos(null); return; }
    const ubicar = () => {
      const a = refAncla.current?.getBoundingClientRect();
      const p = refPanel.current?.getBoundingClientRect();
      if (!a) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      const w = Math.min(p?.width || anchoMax, anchoMax, vw - 2 * MARGEN);
      const hDeseado = p?.height || 0;
      // Vertical: se prefiere ARRIBA y se voltea si abajo hay más lugar. El espacio
      // disponible descuenta DOS márgenes —el hueco contra el ícono y el aire contra el
      // borde de la ventana—; con uno solo el panel quedaba pegado al borde superior.
      const arriba = a.top - 2 * MARGEN, abajo = vh - a.bottom - 2 * MARGEN;
      const ponerAbajo = hDeseado > arriba && abajo > arriba;
      const disp = Math.max(80, ponerAbajo ? abajo : arriba);
      const h = Math.min(hDeseado || disp, disp);
      // el clamp final cubre el caso en que no haya lugar ni arriba ni abajo (el `80`)
      const top = Math.max(MARGEN, Math.min(
        ponerAbajo ? a.bottom + MARGEN : a.top - MARGEN - h, vh - h - MARGEN));
      // horizontal: centrado en el ancla y luego pegado adentro de la ventana
      let left = a.left + a.width / 2 - w / 2;
      left = Math.max(MARGEN, Math.min(left, vw - w - MARGEN));
      setPos({ top, left, width: w, maxHeight: disp });
    };
    ubicar();
    // Cualquier movimiento del fondo invalida la posición: se recalcula. `capture`
    // para enterarse también del scroll de los contenedores internos, que no burbujea.
    window.addEventListener("scroll", ubicar, true);
    window.addEventListener("resize", ubicar);
    const esc = (e) => { if (e.key === "Escape") { setAbierto(false); setFijo(false); } };
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("scroll", ubicar, true);
      window.removeEventListener("resize", ubicar);
      window.removeEventListener("keydown", esc);
    };
  }, [abierto, anchoMax]);

  // el clic afuera cierra: en táctil no hay "salir con el mouse"
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e) => {
      if (!refAncla.current?.contains(e.target) && !refPanel.current?.contains(e.target)) {
        setAbierto(false); setFijo(false);
      }
    };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [abierto]);

  const panel = abierto && typeof document !== "undefined" ? createPortal(
    <div ref={refPanel} role="tooltip" style={{
      position: "fixed", zIndex: 200,
      top: pos ? pos.top : -9999, left: pos ? pos.left : -9999,
      width: pos ? pos.width : undefined, maxWidth: anchoMax,
      maxHeight: pos ? pos.maxHeight : undefined, overflowY: "auto", overscrollBehavior: "contain",
      background: c.overlay, color: c.txt, padding: "9px 11px", borderRadius: R.md,
      fontSize: TAM.base, fontWeight: 400, lineHeight: 1.55, textAlign: "left",
      boxShadow: SOMBRA.pop, whiteSpace: "normal", border: `1px solid ${c.border}`,
      // Barra de scroll VISIBLE. Cuando la ayuda no entra, el texto se corta a mitad de
      // renglón; sin una barra a la vista eso se lee como un panel roto y no como algo
      // que se puede seguir leyendo. Es la mitad del arreglo, y no es cosmética.
      scrollbarWidth: "thin", scrollbarColor: `${c.txt3} transparent`,
      // invisible hasta estar medido y ubicado, para que no se vea el salto
      opacity: pos ? 1 : 0, transition: `opacity ${TRANS}`,
    }}
      // entrar al panel cancela el cierre: es lo que permite leerlo y scrollearlo
      onMouseEnter={cancelarCierre} onMouseLeave={cerrarLuego}
    >{contenido}</div>, document.body) : null;

  return (
    <>
      <span ref={refAncla} tabIndex={0} style={{ display: "inline-flex", cursor: "help" }}
        onMouseEnter={abrir}
        onMouseLeave={cerrarLuego}
        onFocus={abrir}
        onBlur={cerrarLuego}
        // El clic FIJA, no alterna: en un teléfono el toque dispara antes un
        // mouseenter sintético, así que alternar lo cerraba de inmediato.
        onClick={(e) => { e.stopPropagation(); cancelarCierre(); setAbierto(true); setFijo(true); }}>
        {children}
      </span>
      {panel}
    </>
  );
}

// Ícono de ayuda. `tabIndex` para que también se abra con teclado: la explicación no
// puede quedar disponible sólo para quien usa mouse.
export function Ayuda({ children }) {
  return (
    <span style={{ marginLeft: 6, verticalAlign: "middle", display: "inline-flex" }}>
      <Flotante contenido={children}>
        <span aria-hidden style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 15, height: 15, borderRadius: R.full, border: `1px solid ${c.txt3}`,
          // el signo es un ÍCONO: su tamaño lo fija el círculo que lo contiene, no la
          // escala tipográfica de la interfaz
          color: c.txt3, fontSize: 10, fontWeight: 700, lineHeight: 1,
        }}>?</span>
      </Flotante>
    </span>
  );
}

// Tooltip sobre cualquier contenido (encabezados de tabla, badges, valores).
//
// `bloque` es necesario cuando lo envuelto es de nivel bloque: el contenedor es
// `inline-flex` para ceñirse al texto, y sin esto una fila completa se colapsaba al
// ancho de su contenido y la siguiente se le metía al lado en la misma línea.
export function Tip({ texto, children, bloque = false }) {
  if (!texto) return children;
  return (
    <span style={bloque ? { display: "flex", width: "100%" } : { display: "inline-flex" }}>
      <Flotante contenido={texto}>
        {bloque ? <span style={{ width: "100%", minWidth: 0 }}>{children}</span> : children}
      </Flotante>
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENEDORES
// ═══════════════════════════════════════════════════════════════════════════════

// TARJETA: una tarjeta = una tarea. El título va arriba, la descripción abajo del
// título y las acciones a la derecha; ese orden es fijo para que el ojo no tenga que
// buscarlas en cada tarjeta distinta.
export function Card({ titulo, desc, acciones, tono, pad = SP.lg - 4, children, style }) {
  const T = tono ? TONO[tono] : null;
  return (
    <section className="bx-card" style={{
      background: c.raised, border: `1px solid ${T ? T.bd : c.border}`, borderRadius: R.lg,
      padding: pad, marginBottom: SP.md, minWidth: 0, maxWidth: "100%",
      boxShadow: SOMBRA.card, ...style,
    }}>
      {(titulo || acciones) && (
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          gap: SP.md, marginBottom: desc ? SP.xs : SP.md }}>
          <div style={{ minWidth: 0 }}>
            {titulo && <h3 style={{ ...t.h2, margin: 0 }}>{titulo}</h3>}
            {desc && <p style={{ ...t.body, fontSize: TAM.base, margin: `${SP.xs}px 0 0` }}>{desc}</p>}
          </div>
          {acciones && <div style={{ display: "flex", gap: SP.sm, flexShrink: 0 }}>{acciones}</div>}
        </header>
      )}
      {desc && <div style={{ height: SP.md - SP.xs }} />}
      {children}
    </section>
  );
}

// ENCABEZADO DE PANTALLA: título grande + una línea que dice para qué sirve la
// pantalla. Es el ancla de la jerarquía; sin él, todas las tarjetas pesaban igual.
export function Encabezado({ titulo, desc, acciones }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between",
      gap: SP.md, marginBottom: SP.lg, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ ...t.h1, margin: 0 }}>{titulo}</h1>
        {desc && <p style={{ ...t.body, margin: `${SP.sm}px 0 0`, maxWidth: 620 }}>{desc}</p>}
      </div>
      {acciones && <div style={{ display: "flex", gap: SP.sm, flexShrink: 0 }}>{acciones}</div>}
    </div>
  );
}

// ACORDEÓN — el mecanismo con el que se esconde todo lo que no se toca a diario.
// `<details>` nativo: funciona sin JS, es accesible y conserva su estado al re-render.
export function Acordeon({ titulo, resumen, abierto = false, tono, children }) {
  const T = tono ? TONO[tono] : null;
  return (
    <details className="bx-acc" open={abierto} style={{
      background: c.raised, border: `1px solid ${T ? T.bd : c.border}`, borderRadius: R.lg,
      marginBottom: SP.sm + 2, overflow: "hidden",
    }}>
      <summary style={{ display: "flex", alignItems: "center", gap: SP.sm + 2,
        padding: `${SP.sm + 2}px ${SP.md}px` }}>
        {/* ícono, no texto: a 13 px la flecha compite con el título del acordeón */}
        <span className="bx-flecha" aria-hidden style={{ color: c.txt3, fontSize: 9, lineHeight: 1 }}>▶</span>
        <span style={{ ...t.bodyF, flex: 1 }}>{titulo}</span>
        {resumen && <span style={{ ...t.micro, fontFamily: MONO }}>{resumen}</span>}
      </summary>
      <div className="bx-cuerpo" style={{ padding: `0 ${SP.md}px ${SP.md}px`, borderTop: `1px solid ${c.border}`, paddingTop: SP.md }}>
        {children}
      </div>
    </details>
  );
}

// Bloque "Configuración avanzada": el mismo acordeón, pero con el rótulo unificado.
// Que se llame SIEMPRE igual es lo que enseña al usuario dónde está lo que no ve.
export function Avanzado({ resumen, abierto = false, children, titulo = "Configuración avanzada" }) {
  return <Acordeon titulo={titulo} resumen={resumen} abierto={abierto}>{children}</Acordeon>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ÁTOMOS
// ═══════════════════════════════════════════════════════════════════════════════

export function Badge({ tono = "neutro", children, punto = false, tip }) {
  const T = TONO[tono] ?? TONO.neutro;
  const el = (
    <span style={{ ...s.badge, background: T.bg, color: T.fg, border: `1px solid ${T.bd}` }}>
      {punto && <span style={{ width: 5, height: 5, borderRadius: R.full, background: T.fg }} />}
      {children}
    </span>
  );
  return tip ? <Tip texto={tip}>{el}</Tip> : el;
}

// BOTONES con jerarquía explícita. Un `primario` por pantalla; el resto, secundarios.
export function Boton({ variante = "secundario", onClick, children, disabled, title, style }) {
  const base = variante === "primario" ? s.btn : variante === "peligro" ? s.btnR : s.btnG;
  const cls = variante === "primario" ? "bx-btn" : variante === "peligro" ? "bx-btnR" : "bx-btn2";
  const fantasma = variante === "fantasma"
    ? { background: "transparent", border: "1px solid transparent", color: c.txt2 } : null;
  return (
    <button className={cls} onClick={onClick} disabled={disabled} title={title}
      style={{ ...base, ...fantasma, ...(disabled ? { opacity: .45, cursor: "not-allowed" } : null), ...style }}>
      {children}
    </button>
  );
}

// DATO DESTACADO. El valor va grande y en mono; el rótulo, chico y arriba. Al revés
// (rótulo grande, valor chico) es como estaba y obligaba a buscar el número.
export function Stat({ label, valor, unidad, tono, ayuda, sub }) {
  const T = tono ? TONO[tono] : null;
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...t.micro, marginBottom: 3, display: "flex", alignItems: "center" }}>
        {label}{ayuda && <Ayuda>{ayuda}</Ayuda>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5, minWidth: 0 }}>
        <span style={{ ...t.numG, color: T ? T.fg : c.txt, overflow: "hidden", textOverflow: "ellipsis" }}>{valor}</span>
        {unidad && <span style={{ ...t.micro, color: c.txt3 }}>{unidad}</span>}
      </div>
      {sub && <div style={{ ...t.micro, marginTop: 3, color: c.txt3 }}>{sub}</div>}
    </div>
  );
}

// Separador con rótulo, para partir una tarjeta larga sin abrir otra tarjeta.
export function Divisor({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SP.sm + 2, margin: `${SP.lg}px 0 ${SP.md}px` }}>
      {children && <span style={t.eyebrow}>{children}</span>}
      <span style={{ flex: 1, height: 1, background: c.border }} />
    </div>
  );
}

// Estado vacío: dice qué falta y cómo llenarlo, en vez de dejar un hueco.
export function Vacio({ titulo, desc, accion }) {
  return (
    <div style={{ textAlign: "center", padding: `${SP.xl}px ${SP.md}px`, color: c.txt3 }}>
      <div style={{ ...t.bodyF, color: c.txt2, marginBottom: SP.xs }}>{titulo}</div>
      {desc && <div style={{ ...t.body, fontSize: TAM.base, maxWidth: 420, margin: "0 auto" }}>{desc}</div>}
      {accion && <div style={{ marginTop: SP.md }}>{accion}</div>}
    </div>
  );
}

export function Skeleton({ h = 16, w = "100%", style }) {
  return <div className="bx-skel" style={{ height: h, width: w, ...style }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOASTS
// ═══════════════════════════════════════════════════════════════════════════════
// Confirmación efímera de que algo pasó (se guardó, se recalculó). Reemplaza a los
// `alert()` bloqueantes y al silencio absoluto del autoguardado, que era peor: el
// usuario no tenía forma de saber si su trabajo estaba a salvo.

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ProveedorToast({ children }) {
  const [items, setItems] = useState([]);
  const seq = useRef(0);
  const toast = useCallback((texto, tono = "info", ms = 2600) => {
    const id = ++seq.current;
    setItems(v => [...v, { id, texto, tono }]);
    setTimeout(() => setItems(v => v.filter(x => x.id !== id)), ms);
  }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="bx-noPrint" style={{ position: "fixed", right: SP.lg, bottom: SP.lg, zIndex: 90,
        display: "flex", flexDirection: "column", gap: SP.sm, alignItems: "flex-end", pointerEvents: "none" }}>
        {items.map(it => {
          const T = TONO[it.tono] ?? TONO.info;
          return (
            <div key={it.id} className="bx-toast" style={{
              background: c.overlay, border: `1px solid ${T.bd}`, borderLeft: `3px solid ${T.fg}`,
              borderRadius: R.md, padding: `${SP.sm + 2}px ${SP.md}px`, boxShadow: SOMBRA.pop,
              ...t.body, color: c.txt, fontSize: TAM.base, maxWidth: 340,
            }}>{it.texto}</div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LO QUE YA EXISTÍA (sin cambios de contenido, sólo de estilo)
// ═══════════════════════════════════════════════════════════════════════════════

// TABLA DE TRAZABILIDAD — reproduce el orden real del cálculo: cada fila es
// [paso, fórmula, valor, referencia normativa]. La última va resaltada porque es el
// resultado que consume la verificación. Filas nulas se descartan, para poder armarlas
// con condicionales sin ensuciar el llamador.
export function ProcTable({ titulo, filas }) {
  const fs = filas.filter(Boolean);
  return (
    <div style={{ marginBottom: SP.md }}>
      {titulo && <div style={{ ...t.eyebrow, color: c.azulL, marginBottom: SP.sm }}>{titulo}</div>}
      {/* la tabla se ajusta al contenido (no 100%): en tarjetas anchas, estirarla
          separaba las columnas y dejaba huecos enormes entre fórmula y valor.
          El scroll horizontal cubre el caso de fórmulas largas en pantallas chicas. */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ ...s.table, width: "auto", maxWidth: "100%" }}><tbody>
          {fs.map(([paso, formula, valor, ref], i) => {
            const ultima = i === fs.length - 1;
            return (
              <tr key={i} style={{ background: ultima ? c.azulBg : "transparent" }}>
                <td style={{ ...s.tdL, fontSize: TAM.base, whiteSpace: "nowrap", color: ultima ? c.txt : c.txt2 }}>{paso}</td>
                <td style={{ ...s.tdL, fontFamily: MONO, fontSize: TAM.base, color: c.txt3 }}>{formula}</td>
                <td style={{ ...s.td, fontSize: TAM.base, fontWeight: ultima ? 700 : 500, whiteSpace: "nowrap",
                  color: ultima ? c.txt : c.txt2 }}>{valor}</td>
                <td style={{ ...s.td, fontSize: TAM.base, color: c.txt3, whiteSpace: "nowrap" }}>{ref}</td>
              </tr>
            );
          })}
        </tbody></table>
      </div>
    </div>
  );
}

// Tarjeta plegable para tablas largas. Se mantiene por compatibilidad con las pestañas
// que ya la usan; para bloques nuevos, preferir `Acordeon`.
export function Plegable({ titulo, resumen = null, abierto = false, children }) {
  return <Acordeon titulo={titulo} resumen={resumen} abierto={abierto}>{children}</Acordeon>;
}

// PIE DE NAVEGACIÓN de las pestañas de datos. La app no obliga a seguir un orden,
// pero el que llega por primera vez no tiene forma de saber cuál es: este pie lo dice
// y lo encadena en un clic.
export function Siguiente({ irA, a, txt, atras = null }) {
  return (
    <div style={{ display: "flex", gap: SP.sm, alignItems: "center", justifyContent: "flex-end",
      flexWrap: "wrap", margin: `${SP.md}px 0 ${SP.lg}px`, paddingTop: SP.md, borderTop: `1px solid ${c.border}` }}>
      {atras && <Boton onClick={() => irA(atras)}>← {atras}</Boton>}
      <span style={{ ...t.body, fontSize: TAM.base }}>{txt}</span>
      <Boton variante="primario" onClick={() => irA(a)}>{a} →</Boton>
    </div>
  );
}
