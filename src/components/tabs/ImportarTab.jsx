// IMPORTAR LA PLANILLA DE REACCIONES.
//
// La entrada principal es el ARCHIVO, porque es como llega la tabla: el analista manda el
// `.xlsx` y listo. Pegar el texto queda como alternativa y es la salida cuando la planilla
// no se puede leer —hay formatos raros— así que no depende de que el lector ande.
//
// CONTRATO: esto PROPONE, no aplica solo. Se muestra la vista previa completa, con los
// avisos, y recién entonces hay un botón. Un valor mal interpretado acá se propaga a todas
// las combinaciones y a todos los niveles, así que el paso humano no es opcional.
import { useState, useRef } from 'react';
import { s, C, MONO } from '../styles.js';
import { c, t, SP, R, TAM } from '../tokens.js';
import { Card, Boton, Badge, Ayuda, Vacio, Divisor, useToast, Siguiente } from '../ui.jsx';
import { useProyecto, mkNudo } from '../../context/ProyectoContext.jsx';
import { cargasPorNudo, matrizDesdeTexto, ORDENES } from '../../engine/importTabla.js';
import { leerPlanilla } from '../../services/leerXlsx.js';
import { COMPONENTES, COMP_KEYS } from '../../constants/componentes.js';
import { rotuloHip } from '../../constants/hipotesis.js';
import { f2 } from '../../engine/utils.js';

// La tabla «Reacciones en los nudos, por hipótesis» tal como sale de CYPE. Se dejó ÉSTA y
// no una planilla genérica porque muestra de una las tres cosas que el importador resuelve
// solo: la nomenclatura de CYPE (Rx/Ry/Rz, WX±), la columna «Referencia» que aparece sólo
// en la primera fila de cada nudo, y el «Peso propio» como hipótesis aparte.
const EJEMPLO = `Referencia\tDescripción\tRx (kN)\tRy (kN)\tRz (kN)\tMx (kN·m)\tMy (kN·m)\tMz (kN·m)
N1\tPeso propio\t0.557\t0.204\t3.309\t0.03\t0.60\t-0.01
\tDe\t1.527\t0.018\t4.538\t0.01\t1.65\t-0.02
\tDo\t-0.790\t-1.518\t-7.312\t0.02\t-0.77\t0.01
\tTs\t0.880\t1.528\t7.529\t-0.02\t0.87\t-0.01
\tWX+\t-4.245\t-0.600\t-5.620\t0.01\t-5.23\t0.30
\tWX-\t3.096\t0.318\t3.391\t0.00\t3.62\t-0.27
\tEeX\t-4.662\t0.135\t-7.158\t-0.02\t-6.37\t0.11
N2\tPeso propio\t0.418\t0.151\t3.104\t0.02\t0.44\t-0.01
\tDe\t1.204\t0.014\t4.201\t0.01\t1.29\t-0.02
\tDo\t-0.615\t-1.190\t-6.880\t0.02\t-0.60\t0.01`;

export function ImportarTab() {
  const { hips, addHips, nudos, set, irA } = useProyecto();
  const toast = useToast();
  const [txt, setTxt] = useState("");
  const [prev, setPrev] = useState(null);
  const [err, setErr] = useState(null);
  const [fuente, setFuente] = useState(null);
  const [iNudo, setINudo] = useState(0);
  const [reemplazar, setReemplazar] = useState(true);
  const [conNuevas, setConNuevas] = useState(true);
  const fileRef = useRef(null);

  const cargar = (r) => {
    if (!r?.ok) { setErr(r?.avisos?.join(" ") || "No se pudo interpretar."); setPrev(null); return; }
    setErr(null); setPrev(r); setINudo(0);
  };

  // Reinterpreta con otro orden de columnas SIN volver a leer el archivo: lo único que
  // cambia es a qué componente va cada columna, y guardar la fuente evita pedir el archivo
  // de nuevo cada vez que se prueba un orden.
  const reinterpretar = (orden) => {
    if (!fuente) return;
    const M = fuente.tipo === "matriz" ? fuente.matriz : matrizDesdeTexto(fuente.txt);
    cargar(cargasPorNudo(M, hips, { orden }));
  };

  const desdeTexto = (texto) => {
    const f = { tipo: "texto", txt: texto };
    setFuente(f);
    cargar(cargasPorNudo(matrizDesdeTexto(texto), hips));
  };

  const desdePlanilla = async (file) => {
    if (!file) return;
    setPrev(null); setErr(null);
    try {
      const { hojas } = await leerPlanilla(file);
      // Se elige la hoja con MÁS nudos reconocidos, no la primera: un libro real suele traer
      // una carátula o una hoja de notas antes de la de reacciones, y quedarse con la
      // primera fallaría justo en el caso normal.
      const cand = hojas.map(h => ({ h, r: cargasPorNudo(h.matriz, hips) }))
        .filter(x => x.r.ok)
        .sort((a, b) => (b.r.nudos?.length ?? 0) - (a.r.nudos?.length ?? 0));
      if (!cand.length) {
        setErr(`Se leyó «${file.name}» (${hojas.length} hoja${hojas.length > 1 ? "s" : ""}), pero `
          + "en ninguna se reconoció una tabla de reacciones. Revisá que haya una columna de "
          + "descripción con el nombre de cada hipótesis y las columnas de esfuerzos al lado.");
        return;
      }
      const { h, r } = cand[0];
      setFuente({ tipo: "matriz", matriz: h.matriz, archivo: file.name, hoja: h.nombre });
      cargar(hojas.length > 1
        ? { ...r, avisos: [`El libro tiene ${hojas.length} hojas: se tomó «${h.nombre}», que es la que trae más nudos.`, ...r.avisos] }
        : r);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  };

  const aplicar = () => {
    if (!prev?.nudos?.length) return;
    const nuevos = prev.nudos.map((n, i) => {
      const cargas = {};
      for (const f of n.filas) {
        // Una hipótesis nueva que el usuario decidió NO agregar no se importa: meter sus
        // cargas en un proyecto que no la tiene en la lista dejaría datos invisibles, que
        // no se ven en ninguna tabla pero viajan en el archivo exportado.
        if (f.nueva && !conNuevas) continue;
        cargas[f.hip] = { ...f.vals };
      }
      return mkNudo(n.nombre || `N${i + 1}`, cargas);
    });
    const puestas = conNuevas && prev.nuevas?.length ? addHips(prev.nuevas) : [];
    set(st => ({
      nudos: reemplazar ? nuevos : [...st.nudos, ...nuevos],
      nudoAct: reemplazar ? 0 : st.nudos.length,
    }));
    toast(`Importados ${nuevos.length} nudo${nuevos.length > 1 ? "s" : ""}`
      + `${puestas.length ? ` y ${puestas.length} hipótesis nuevas` : ""}.`, "ok", 4000);
    for (const a of prev.avisos || []) toast(a, "aviso", 9000);
    setPrev(null); setTxt(""); setFuente(null);
    irA("Hipótesis");
  };

  const nudo = prev?.nudos?.[iNudo];

  return (<>
    <Card titulo="Traer la tabla de reacciones"
      desc="El archivo de CYPE tal cual, o el bloque pegado. Se reconocen los nombres de CYPE (Rx/Ry/Rz, Mx/My/Mz, WX±, «Peso propio»), la columna «Referencia» combinada y las hipótesis en filas o en columnas.">
      <div style={{ display: "flex", gap: SP.sm, flexWrap: "wrap", alignItems: "center" }}>
        <Boton variante="primario" onClick={() => fileRef.current?.click()}>
          📄 Elegir planilla (.xlsx / .csv)
        </Boton>
        <input ref={fileRef} type="file" accept=".xlsx,.csv,.txt,.tsv" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; desdePlanilla(f); }} />
        <Boton onClick={() => { setTxt(EJEMPLO); desdeTexto(EJEMPLO); }}>Probar con un ejemplo</Boton>
        <Ayuda>
          <b>Qué resuelve solo.</b><br />
          · Reconoce las tres notaciones de columna: la interna (N, Vx, Myy…), la del resumen
          de fuerzas (Fz, Fx, My…) y la de CYPE (Rz, Rx, My…).<br />
          · Parte la planilla por nudo aunque la columna «Referencia» venga combinada y sólo
          aparezca en la primera fila de cada bloque.<br />
          · Transpone el bloque si las hipótesis están en el encabezado en vez de en filas.<br />
          · Lee la notación científica de Excel (<code>1.79E-2</code>), que es como guarda
          todo valor chico.<br /><br />
          <b>Qué NO hace.</b> No traduce signos. <code>N</code> es positiva en compresión
          sobre el apoyo; si tu modelo da la reacción vertical positiva hacia arriba, hay que
          invertirla. Ningún control automático distingue un signo mal de una tracción real.
        </Ayuda>
      </div>

      <Divisor>o pegá el bloque</Divisor>
      <textarea value={txt} onChange={e => setTxt(e.target.value)} rows={6}
        placeholder="Pegá acá las filas copiadas de la planilla o del PDF…"
        style={{ ...s.inp, width: "100%", fontFamily: MONO, fontSize: TAM.base, resize: "vertical" }} />
      <div style={{ marginTop: SP.sm }}>
        <Boton onClick={() => desdeTexto(txt)} disabled={!txt.trim()}>Interpretar el texto</Boton>
      </div>

      {err && (
        <div style={{ marginTop: SP.md, padding: SP.md, borderRadius: R.md,
          background: c.rojoBg, border: `1px solid ${c.rojoBd}`, ...t.body, color: c.txt }}>
          {err}
        </div>
      )}
    </Card>

    {prev && (
      <Card titulo="Vista previa"
        desc="Revisá los valores antes de aplicar. Nada se toca hasta que aprietes el botón de abajo."
        acciones={<Boton variante="primario" onClick={aplicar}>Aplicar al proyecto</Boton>}>

        {/* El orden de columnas SÓLO se ofrece cuando hubo que deducirlo. Con encabezado no
            hay nada que elegir —lo dice la tabla— y un selector ahí invita a romperlo. */}
        {prev.sinEncabezado && (
          <div style={{ ...s.row, marginBottom: SP.md }}>
            <span style={s.lbl}>Orden de las columnas
              <Ayuda>El bloque llegó sin la fila de nombres, así que hubo que deducirlo por la
                magnitud de los valores: en un apoyo de gravedad, la columna que domina es el
                axial. Si la tabla es de CYPE, el axial va TERCERO. Cambialo y los valores se
                reasignan al instante.</Ayuda>
            </span>
            <select style={s.sel} value={prev.orden || "interno"}
              onChange={e => reinterpretar(e.target.value)}>
              {Object.entries(ORDENES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: "flex", gap: SP.sm, flexWrap: "wrap", alignItems: "center",
          marginBottom: SP.md }}>
          <span style={t.eyebrow}>Nudos</span>
          {prev.nudos.map((n, i) => (
            <button key={i} onClick={() => setINudo(i)} className="bx-btn2"
              style={{ ...s.btnG, ...(i === iNudo ? { borderColor: c.azul, color: c.txt } : null) }}>
              {n.nombre || `(sin nombre ${i + 1})`}
              <span style={{ ...t.micro, marginLeft: 6 }}>{n.filas.length}</span>
            </button>
          ))}
        </div>

        {nudo && (
          <div style={{ overflowX: "auto" }}>
            <table className="bx-tabla" style={s.table}>
              <thead><tr>
                <th style={{ ...s.th, textAlign: "left" }}>Hipótesis</th>
                {COMPONENTES.map(cm => (
                  <th key={cm.k} style={s.th}>{cm.rot}<br />
                    <span style={{ ...t.micro, fontWeight: 400 }}>{cm.uni}</span></th>
                ))}
              </tr></thead>
              <tbody>
                {nudo.filas.map((f, i) => (
                  <tr key={i}>
                    <td style={{ ...s.tdL, whiteSpace: "nowrap" }}>
                      <b>{f.hip}</b>
                      <span style={{ ...t.micro, marginLeft: 6 }}>{f.nueva ? "nueva" : rotuloHip(f.hip)}</span>
                    </td>
                    {COMP_KEYS.map(k => (
                      <td key={k} style={{ ...s.td, color: f.vals[k] === undefined ? c.txt3 : undefined }}>
                        {f.vals[k] === undefined ? "—" : f2(f.vals[k])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!!nudo?.avisos?.length && (
          <div style={{ ...s.note, color: C.yellow }}>
            {nudo.avisos.map((a, i) => <div key={i}>⚠ {a}</div>)}
          </div>
        )}
        {!!prev.avisos?.length && (
          <div style={{ ...s.note, color: C.yellow }}>
            {prev.avisos.map((a, i) => <div key={i}>⚠ {a}</div>)}
          </div>
        )}

        <Divisor>Qué hacer con esto</Divisor>
        {!!prev.nuevas?.length && (
          <label style={{ display: "flex", gap: SP.sm, alignItems: "flex-start", marginBottom: SP.sm,
            ...t.body, color: c.txt, cursor: "pointer" }}>
            <input type="checkbox" checked={conNuevas} onChange={e => setConNuevas(e.target.checked)}
              style={{ marginTop: 3 }} />
            <span>
              Agregar al proyecto las <b>{prev.nuevas.length} hipótesis</b> que la planilla trae y
              la lista todavía no tiene: <code>{prev.nuevas.join(", ")}</code>.
              <br />
              <span style={t.micro}>Van al final de la lista, así que las columnas de la matriz de
                combinaciones que ya tengas escritas no se mueven. Si las destildás, esas filas
                no se importan.</span>
            </span>
          </label>
        )}
        <label style={{ display: "flex", gap: SP.sm, alignItems: "flex-start", ...t.body,
          color: c.txt, cursor: "pointer" }}>
          <input type="checkbox" checked={reemplazar} onChange={e => setReemplazar(e.target.checked)}
            style={{ marginTop: 3 }} />
          <span>
            <b>Reemplazar</b> los {nudos.length} nudo{nudos.length > 1 ? "s" : ""} del proyecto por
            los {prev.nudos.length} de la planilla.
            <br />
            <span style={t.micro}>Destildado, se agregan al final y los actuales quedan como están.
              Reemplazar es el patrón porque un listado de reacciones es completo por
              construcción: mezclarlo con cargas anteriores deja datos viejos en hipótesis que la
              planilla nueva no traía, y eso no falla —da un resultado plausible y equivocado—.</span>
          </span>
        </label>
      </Card>
    )}

    {!prev && !err && (
      <Card>
        <Vacio titulo="Todavía no importaste nada"
          desc="Elegí la planilla de reacciones o pegá el bloque. También podés cargar los valores a mano en la pestaña Hipótesis." />
      </Card>
    )}

    <Siguiente irA={irA} a="Hipótesis" txt="Cuando esté importado:" />
  </>);
}
