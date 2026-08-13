// MATRICES DE COMBINACIÓN — ELU y ELS, editables.
//
// Las columnas salen de la LISTA VIVA de hipótesis del proyecto, no de una constante: si el
// modelo trajo `V(90°)H1`, la matriz tiene esa columna. Es la diferencia de fondo con la
// pestaña homónima de `bases-v-0.1`, donde las diecisiete hipótesis son del programa.
import { useRef, useState } from 'react';
import { s, C, MONO } from '../styles.js';
import { c, t, SP, R, TAM } from '../tokens.js';
import { Card, Boton, Ayuda, Siguiente, useToast } from '../ui.jsx';
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { num } from '../../engine/utils.js';
import { mkCombo, DEF_ELU, DEF_ELS, NORMATIVAS_ELU, NORMATIVAS_ELS } from '../../constants/combosDef.js';
import { comboDescNatural, esAccidental, familiaHip, rotuloHip } from '../../constants/hipotesis.js';
import { serializarCombos, leerCombos, aCombos } from '../../engine/setCombos.js';

// celda compacta: sin spinners y con el ancho justo del factor (p. ej. "1,20")
const CELDA = { width: 40, padding: "2px 3px", fontSize: TAM.base, textAlign: "center" };

function Matriz({ titulo, combos, setCombos, pref, defs, normativas, hips }) {
  const [norma, setNorma] = useState("");
  const setF = (k, hip, v) => setCombos(cs => cs.map(x => x.k === k
    ? { ...x, f: { ...x.f, [hip]: v === "" ? 0 : parseFloat(v) } } : x));
  const del = k => setCombos(cs => cs.filter(x => x.k !== k));
  const add = () => setCombos(cs => [...cs, mkCombo({})]);
  const dup = k => setCombos(cs => {
    const i = cs.findIndex(x => x.k === k);
    if (i < 0) return cs;
    return [...cs.slice(0, i + 1), mkCombo({ ...cs[i].f }), ...cs.slice(i + 1)];
  });
  const cargarNorma = (key) => {
    setNorma(key);
    const n = normativas[key];
    if (n) setCombos(n.combos.map(f => mkCombo({ ...f })));
  };

  return (
    <Card titulo={titulo} acciones={
      <>
        <Boton onClick={add}>+ Combinación</Boton>
        <Boton onClick={() => { setNorma(""); setCombos(defs.map(f => mkCombo({ ...f }))); }}>↺ Patrón</Boton>
      </>
    }>
      <div style={{ marginBottom: SP.md }}>
        <select style={s.sel} value={norma} onChange={e => cargarNorma(e.target.value)}>
          <option value="">Cargar set por normativa…</option>
          {Object.entries(normativas).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {norma && normativas[norma] && (
          <div style={{ ...s.note, color: C.cyan }}>
            <b>{normativas[norma].label}:</b> {normativas[norma].nota}
          </div>
        )}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="bx-tabla" style={{ ...s.table, width: "auto" }}>
          <thead><tr>
            <th style={{ ...s.th, padding: "4px 6px", textAlign: "left" }}>Comb.</th>
            {hips.map(k => (
              <th key={k} title={rotuloHip(k)}
                style={{ ...s.th, fontFamily: MONO, padding: "4px 2px",
                  // Las accidentales se distinguen en el encabezado: son las que hacen que la
                  // combinación entera cambie de criterio aguas abajo.
                  color: familiaHip(k) === "accidental" ? c.ambar : undefined }}>φ{k}</th>
            ))}
            <th style={{ ...s.th, padding: "4px 6px", textAlign: "left" }}>Descripción</th>
            <th style={{ ...s.th, padding: "4px 2px" }}></th>
          </tr></thead>
          <tbody>
            {combos.map((x, i) => {
              const vacia = !Object.values(x.f || {}).some(v => num(v, 0) !== 0);
              return (
                <tr key={x.k}>
                  <td style={{ ...s.tdL, padding: "2px 6px", color: C.accentL, fontWeight: 700,
                    whiteSpace: "nowrap" }}>
                    {pref}{i + 1}{esAccidental(x.f) ? " ᴬ" : ""}
                  </td>
                  {hips.map(k => (
                    <td key={k} style={{ ...s.td, padding: "2px 1px" }}>
                      <input className="bx-in" style={{ ...s.inp, ...CELDA }} type="number" step="any"
                        value={num(x.f[k], 0) !== 0 ? x.f[k] : ""} placeholder="·"
                        aria-label={`${pref}${i + 1} factor de ${k}`}
                        onChange={e => setF(x.k, k, e.target.value)} />
                    </td>
                  ))}
                  <td style={{ ...s.tdL, padding: "2px 6px", color: vacia ? c.ambar : C.muted,
                    whiteSpace: "nowrap" }}>
                    {vacia ? "sin hipótesis — va a dar todo cero" : comboDescNatural(x.f, hips)}
                  </td>
                  <td style={{ ...s.td, padding: "2px 1px", whiteSpace: "nowrap" }}>
                    <button style={s.btnR} onClick={() => dup(x.k)} title="duplicar"
                      aria-label="duplicar">⧉</button>
                    <button style={s.btnR} onClick={() => del(x.k)} title="eliminar"
                      aria-label="eliminar">✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={s.note}>
        {combos.length} combinaciones · ᴬ = con acción accidental (viento, sismo o
        accidentales). Una celda vacía es factor cero: la hipótesis no participa.
      </div>
    </Card>
  );
}

// GUARDAR EL SET Y VOLVER A TRAERLO. Las combinaciones son lo que menos cambia entre
// proyectos y lo que más cuesta tipear: una oficina usa el mismo criterio en todos sus
// modelos. El archivo lleva SÓLO las dos matrices —ni cargas, ni nudos, ni niveles— así que
// se puede versionar y compartir sin arrastrar un proyecto entero.
function SetCombos() {
  const { combosU, setCombosU, combosS, setCombosS, hips, addHips, proyecto } = useProyecto();
  const toast = useToast();
  const fileRef = useRef(null);

  const exportar = () => {
    const d = serializarCombos({ combosU, combosS, hips, nombre: proyecto });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }));
    a.download = `${(proyecto || "combinaciones").replace(/\s+/g, "_")}.combos.json`;
    a.click();
    toast(`Exportadas ${combosU.length} ELU y ${combosS.length} ELS.`, "ok");
  };

  const importar = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";                              // permite reimportar el mismo archivo
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const r = leerCombos(rd.result);
      // UN ARCHIVO MALO NO PISA NADA. Si algo no se pudo leer se aborta la importación
      // entera: dejar media matriz nueva y media vieja es peor que no importar.
      if (!r.ok) { toast(r.error, "error", 7000); return; }
      const puestos = [];
      if (r.sets.ELU) { setCombosU(aCombos(r.sets.ELU)); puestos.push(`${r.sets.ELU.length} ELU`); }
      if (r.sets.ELS) { setCombosS(aCombos(r.sets.ELS)); puestos.push(`${r.sets.ELS.length} ELS`); }
      // Las hipótesis que el set menciona y el proyecto no tiene se agregan solas: sin eso,
      // los factores entrarían al estado pero sin columna donde verse ni editarse.
      const faltan = (r.hipotesis || []).filter(k => !hips.includes(k));
      const nuevas = faltan.length ? addHips(faltan) : [];
      toast(`Importadas ${puestos.join(" y ")}${r.nombre ? ` (de «${r.nombre}»)` : ""}.`, "ok");
      if (nuevas.length) toast(`Se agregaron las hipótesis que el set usaba: ${nuevas.join(", ")}.`, "ok", 7000);
      for (const a of r.avisos) toast(a, "aviso", 9000);
    };
    rd.readAsText(f);
  };

  return (
    <Card titulo="Set de combinaciones" acciones={
      <>
        <Boton onClick={exportar}>⤓ Exportar set</Boton>
        <Boton onClick={() => fileRef.current?.click()}>⤒ Importar set</Boton>
      </>
    }>
      <input ref={fileRef} type="file" accept=".json,application/json"
        style={{ display: "none" }} onChange={importar} />
      <div style={{ ...t.body, color: c.txt }}>
        Guarda las <b>dos matrices</b> en un <code>.combos.json</code> aparte del proyecto, para
        armar el criterio una vez y reusarlo. No lleva cargas, nudos ni niveles.
        <br /><br />
        Al importar, <b>las matrices se reemplazan por completo</b>. Una hipótesis que el set use
        y este proyecto no tenga <b>se agrega sola</b> a la lista; un factor que no sea un número
        aborta la importación entera en vez de tomarlo como cero.
        <br /><br />
        Un set exportado desde la app de <b>bases</b> se abre tal cual: son las mismas matrices.
        Lo único que se descarta es <code>Ds</code>, el peso propio de la fundación, que allá lo
        calcula el programa a partir de la geometría y acá no existe.
      </div>
    </Card>
  );
}

export function CombinacionesTab() {
  const { combosU, setCombosU, combosS, setCombosS, hips, irA } = useProyecto();
  return (<>
    <Card titulo="Criterio">
      <div style={{ ...t.body, color: c.txt }}>
        Las combinaciones <b>últimas (ELU)</b> mayoran las acciones y son con las que se
        dimensiona; las de <b>servicio (ELS)</b> van con acciones características y son las que
        alimentan las verificaciones geotécnicas y de deformación. La app calcula las dos y las
        muestra por separado: cuál corresponde a cada verificación lo decide quien recibe estos
        números.
        <br /><br />
        Los coeficientes se aplican <b>con signo</b>. El sentido desfavorable de las acciones
        alternantes queda cubierto porque el viento entra en sus cuatro sentidos como casos
        separados y el sismo en un eje por combinación, y al final se toma la envolvente.
        <br /><br />
        <b style={{ color: c.ambar }}>El «Peso propio» acompaña al peso de estado.</b> CYPE lo
        entrega como hipótesis aparte, así que una combinación que diga sólo <code>1,20·Do</code>
        <b> deja afuera el peso propio de la estructura</b>. Por eso los sets de esta app llevan
        <code> PP</code> con el mismo factor que el peso que acompañan. Si tu modelo ya lo tiene
        incluido dentro de <code>Do</code>, <code>PP</code> va a venir en cero y no cambia nada.
      </div>
    </Card>
    <SetCombos />
    <Matriz titulo="Combinaciones últimas (ELU)" hips={hips}
      combos={combosU} setCombos={setCombosU} pref="ELU" defs={DEF_ELU} normativas={NORMATIVAS_ELU} />
    <Matriz titulo="Combinaciones en servicio (ELS)" hips={hips}
      combos={combosS} setCombos={setCombosS} pref="ELS" defs={DEF_ELS} normativas={NORMATIVAS_ELS} />
    <Siguiente irA={irA} atras="Hipótesis" a="Niveles"
      txt="Con el criterio armado:" />
  </>);
}
