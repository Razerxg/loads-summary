// SELECTOR DEL NUDO ACTIVO.
//
// Va en TODAS las pantallas que muestran números de un nudo —resumen, resultados— y no sólo
// en una. Una planilla de reacciones trae todos los nudos del modelo, y si el selector
// viviera en una sola pantalla habría que volver a ella para cambiar de nudo y perder de
// vista la tabla que se estaba comparando, que es justamente lo que se quiere hacer.
//
// Las combinaciones y los niveles NO llevan selector: son del proyecto entero y valen para
// todos los nudos. Ofrecerlo ahí diría «estás editando las combinaciones del nudo N1», que
// es mentira.
import { s } from './styles.js';
import { c, t, SP, R, TAM } from './tokens.js';
import { useProyecto } from '../context/ProyectoContext.jsx';

export function SelectorNudo({ conEditar = false }) {
  const { nudos, nudoAct, setNudoAct, set, addNudo, delNudo } = useProyecto();
  const i = nudos.findIndex(n => n.id === nudoAct?.id);

  return (
    <div style={{ display: "flex", gap: SP.sm, alignItems: "center", flexWrap: "wrap",
      marginBottom: SP.md, padding: `${SP.sm}px ${SP.md}px`, background: c.surface,
      border: `1px solid ${c.border}`, borderRadius: R.md }}>
      <span style={t.eyebrow}>Nudo</span>
      <select style={{ ...s.sel, minWidth: 140 }} value={i < 0 ? 0 : i}
        onChange={e => setNudoAct(Number(e.target.value))}>
        {nudos.map((n, k) => (
          <option key={n.id} value={k}>
            {n.nombre || `(sin nombre ${k + 1})`} — {Object.keys(n.cargas || {}).length} hip.
          </option>
        ))}
      </select>
      {conEditar && (<>
        <input style={{ ...s.inp, width: 120, fontFamily: "inherit" }} value={nudoAct?.nombre ?? ""}
          placeholder="nombre" aria-label="Nombre del nudo"
          onChange={e => set(st => ({
            nudos: st.nudos.map(n => n.id === nudoAct.id ? { ...n, nombre: e.target.value } : n),
          }))} />
        <button style={s.btnG} onClick={addNudo} title="Agregar un nudo vacío">+ Nudo</button>
        <button style={s.btnR} onClick={() => delNudo(nudoAct.id)}
          disabled={nudos.length <= 1}
          title={nudos.length <= 1 ? "Tiene que quedar al menos uno" : "Eliminar este nudo"}>✕</button>
      </>)}
      <div style={{ flex: 1 }} />
      <span style={{ ...t.micro, fontSize: TAM.base }}>
        {nudos.length} nudo{nudos.length > 1 ? "s" : ""} en el proyecto
      </span>
    </div>
  );
}
