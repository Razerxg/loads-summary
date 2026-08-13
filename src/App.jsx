// SHELL DE LA APLICACIÓN — barra lateral, barra superior y el panel de la pantalla activa.
//
// La navegación NO se oculta por CSS en pantallas angostas. Ocultarla dejaba a la app sin
// ninguna forma de moverse en un teléfono —encerrada en la pantalla en la que uno hubiera
// caído—, que es bastante peor que el problema de espacio que venía a resolver. En angosto
// la barra pasa a ser un cajón superpuesto que abre el botón hamburguesa.
import { useState, useEffect, useRef } from 'react';
import { ProyectoProvider, useProyecto } from './context/ProyectoContext.jsx';
import { EstilosGlobales } from './components/EstilosGlobales.jsx';
import { ProveedorToast, useToast, Boton } from './components/ui.jsx';
import { c, t, SP, R, TRANS, TAM, ANCHO_CONTENIDO, ANCHO_SIDEBAR, TEMA_DEF } from './components/tokens.js';
import { TABS, TABS_DESC } from './constants/tabs.js';
import { GuiaTab } from './components/tabs/GuiaTab.jsx';
import { ImportarTab } from './components/tabs/ImportarTab.jsx';
import { HipotesisTab } from './components/tabs/HipotesisTab.jsx';
import { CombinacionesTab } from './components/tabs/CombinacionesTab.jsx';
import { NivelesTab } from './components/tabs/NivelesTab.jsx';
import { ResultadosTab } from './components/tabs/ResultadosTab.jsx';
import { ReporteTab } from './components/tabs/ReporteTab.jsx';

const PANELS = {
  "Guía": GuiaTab, "Importar": ImportarTab, "Hipótesis": HipotesisTab,
  "Combinaciones": CombinacionesTab, "Niveles": NivelesTab, "Resultados": ResultadosTab,
  "Reporte": ReporteTab,
};

// El Reporte usa TODO el ancho disponible: es un documento de hoja A4 y acotarlo al ancho de
// contenido del resto de la app le mete una barra de desplazamiento horizontal permanente.
const ANCHO_LIBRE = new Set(["Reporte"]);

const CLAVE_TEMA = "reacciones.tema";

function Sidebar({ abierta, cerrar }) {
  const { tab, setTab } = useProyecto();
  const angosta = typeof window !== "undefined" && window.innerWidth <= 900;

  return (<>
    {/* El velo sólo existe en el modo cajón: en ancho, la barra es parte del layout. */}
    {abierta && angosta && (
      <div onClick={cerrar} style={{ position: "fixed", inset: 0, zIndex: 79,
        background: "rgba(0,0,0,.5)" }} />
    )}
    <nav className="bx-sidebar" aria-label="Secciones" style={{
      background: c.surface, borderRight: `1px solid ${c.border}`,
      padding: `${SP.md}px ${SP.sm}px`, overflowY: "auto",
      ...(angosta ? {
        position: "fixed", top: 0, bottom: 0, left: 0, width: ANCHO_SIDEBAR, zIndex: 80,
        transform: abierta ? "none" : "translateX(-100%)", transition: `transform ${TRANS}`,
      } : { position: "sticky", top: 0, height: "100vh" }),
    }}>
      <div style={{ ...t.h2, padding: `0 ${SP.sm}px ${SP.md}px`, color: c.txt }}>
        Reacciones
        <div style={{ ...t.micro, fontWeight: 400, marginTop: 2 }}>CYPE → combinaciones</div>
      </div>
      {TABS.map((n, i) => {
        const act = i === tab;
        return (
          <button key={n} className="bx-nav" onClick={() => { setTab(i); cerrar(); }}
            aria-current={act ? "page" : undefined}
            style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer",
              background: act ? c.azulBg : "transparent", color: act ? c.txt : c.txt2,
              border: "none", borderLeft: `2px solid ${act ? c.azul : "transparent"}`,
              borderRadius: `0 ${R.sm}px ${R.sm}px 0`, padding: `${SP.sm}px ${SP.sm + 2}px`,
              fontSize: TAM.base, fontWeight: act ? 600 : 500, transition: `background ${TRANS}` }}>
            {n}
            <div style={{ ...t.micro, fontWeight: 400, marginTop: 1 }}>{TABS_DESC[n]}</div>
          </button>
        );
      })}
    </nav>
  </>);
}

function BarraSuperior({ onNav, tema, setTema }) {
  const { proyecto, exportar, importar, reiniciar } = useProyecto();
  const toast = useToast();
  const fileRef = useRef(null);

  const guardar = () => {
    const d = exportar();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }));
    a.download = `${(proyecto || "proyecto").replace(/\s+/g, "_")}.reacciones.json`;
    a.click();
    toast("Proyecto guardado.", "ok");
  };

  const abrir = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      let d = null;
      try { d = JSON.parse(rd.result); } catch { /* lo informa `importar` */ }
      const r = importar(d);
      toast(r.ok ? "Proyecto abierto." : r.error, r.ok ? "ok" : "error", r.ok ? 2600 : 7000);
    };
    rd.readAsText(f);
  };

  return (
    <header className="bx-noPrint" style={{ position: "sticky", top: 0, zIndex: 60,
      background: c.surface, borderBottom: `1px solid ${c.border}`,
      padding: `${SP.sm}px ${SP.md}px`, display: "flex", alignItems: "center",
      gap: SP.sm, flexWrap: "wrap" }}>
      <button className="bx-btn2" onClick={onNav} aria-label="Abrir la navegación"
        style={{ background: "transparent", border: `1px solid ${c.border}`, color: c.txt,
          borderRadius: R.sm + 2, padding: "5px 9px", cursor: "pointer", fontSize: TAM.medio }}>☰</button>
      <span style={{ ...t.bodyF, color: c.txt }}>{proyecto || "Sin nombre"}</span>
      <div style={{ flex: 1 }} />
      <Boton onClick={guardar}>⤓ Guardar</Boton>
      <Boton onClick={() => fileRef.current?.click()}>⤒ Abrir</Boton>
      <input ref={fileRef} type="file" accept=".json,application/json"
        style={{ display: "none" }} onChange={abrir} />
      <Boton variante="fantasma" title="Cambiar entre tema claro y oscuro"
        onClick={() => setTema(tema === "claro" ? "oscuro" : "claro")}>
        {tema === "claro" ? "◐" : "◑"}
      </Boton>
      <Boton variante="peligro" title="Vaciar el proyecto y volver al estado inicial"
        onClick={() => {
          // El proyecto vive en localStorage y no hay «deshacer»: vaciarlo sin preguntar
          // sería borrar una sesión entera de trabajo con un clic al pasar.
          if (confirm("Se van a borrar los nudos, las cargas y las combinaciones de este proyecto. ¿Seguro?")) {
            reiniciar();
            toast("Proyecto vaciado.", "ok");
          }
        }}>Vaciar</Boton>
    </header>
  );
}

function Shell() {
  const { tab } = useProyecto();
  const [nav, setNav] = useState(false);
  const [tema, setTema] = useState(() => {
    try { return localStorage.getItem(CLAVE_TEMA) || TEMA_DEF; } catch { return TEMA_DEF; }
  });
  const nombre = TABS[tab] ?? TABS[0];
  const Panel = PANELS[nombre] ?? GuiaTab;

  // El tema se aplica en el elemento RAÍZ, con un atributo. Los colores de la app son
  // variables CSS, así que cambiar de tema es cambiar este atributo: no re-renderiza nada y
  // no hay que pasar la paleta por contexto a cincuenta componentes.
  useEffect(() => {
    document.documentElement.setAttribute("data-tema", tema);
    try { localStorage.setItem(CLAVE_TEMA, tema); } catch { /* modo privado */ }
  }, [tema]);

  // Al cambiar de pantalla, arriba de todo. Sin esto se llega al medio de la pantalla
  // siguiente, con el scroll donde lo había dejado la anterior.
  useEffect(() => { window.scrollTo({ top: 0 }); }, [tab]);

  return (
    <div className="bx-shell" style={{ display: "grid",
      gridTemplateColumns: `${ANCHO_SIDEBAR}px 1fr`, minHeight: "100vh", background: c.canvas }}>
      <Sidebar abierta={nav} cerrar={() => setNav(false)} />
      <div style={{ minWidth: 0 }}>
        <BarraSuperior onNav={() => setNav(v => !v)} tema={tema} setTema={setTema} />
        <main className="bx-main" style={{ padding: `${SP.lg}px ${SP.lg}px ${SP.xxl}px`,
          maxWidth: ANCHO_LIBRE.has(nombre) ? "none" : ANCHO_CONTENIDO,
          margin: "0 auto", minWidth: 0 }}>
          <h1 style={{ ...t.h1, margin: `0 0 ${SP.lg}px` }}>{nombre}</h1>
          <Panel />
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <>
      <EstilosGlobales />
      <ProveedorToast>
        <ProyectoProvider><Shell /></ProyectoProvider>
      </ProveedorToast>
    </>
  );
}
