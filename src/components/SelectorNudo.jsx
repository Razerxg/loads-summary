// SELECTOR DEL NUDO — y del MODO en que se leen los nudos.
//
// Hay dos situaciones reales y opuestas, y de cuál sea depende todo lo que muestra la app:
//
//  · **UN NUDO, UNA FUNDACIÓN.** Veinte soportes con veinte bases independientes. Cada nudo
//    se mira por separado y sumarlos no significaría nada.
//  · **VARIOS NUDOS, UNA FUNDACIÓN.** Un sleeper, una platea corrida, el skid apoyado en sus
//    cuatro puntos. Esa fundación recibe todas las reacciones a la vez, y lo que hay que
//    equilibrar para la estabilidad global es la RESULTANTE del conjunto.
//
// El interruptor arranca en el primer modo porque es el que no exige ninguna decisión previa:
// encender la suma sin querer cambiaría todos los números de golpe y nada lo delataría.
//
// Va en TODAS las pantallas que muestran números —resumen, resultados, memoria— y no en una
// sola: si el modo viviera en una pantalla aparte, se podría estar mirando una tabla de
// conjunto creyendo que es de un nudo, que es la confusión más cara posible acá.
import { s, C } from './styles.js';
import { c, t, SP, R, TAM } from './tokens.js';
import { Badge, Ayuda } from './ui.jsx';
import { useProyecto } from '../context/ProyectoContext.jsx';
import { f2 } from '../engine/utils.js';

// A partir de cuántos nudos la lista de casillas arranca plegada. Doce entra en dos
// renglones; de ahí para arriba empieza a comerse la pantalla.
const UMBRAL_PLEGADO = 12;

export function SelectorNudo({ conEditar = false, soloNudo = false }) {
  const { nudos, nudoAct, setNudoAct, set, addNudo, delNudo,
    conjunto, setConjunto, setIncluido, incluidos, suma, setPos } = useProyecto();
  // Tildar o destildar los cien de una. Se hace en UNA sola actualización de estado y no
  // con cien llamadas a `setIncluido`: cada una dispara un render y un recálculo completo.
  const todos = (v) => set(st => ({ nudos: st.nudos.map(n => ({ ...n, incluido: v })) }));
  const i = nudos.findIndex(n => n.id === nudoAct?.id);
  // `soloNudo` es para la pantalla de Hipótesis: ahí se EDITA un nudo, y editar una suma no
  // tiene sentido. El modo sigue vigente en el resto de la app; simplemente no se ofrece acá.
  const conModo = !soloNudo && nudos.length > 1;

  return (
    <div style={{ marginBottom: SP.md, background: c.surface,
      border: `1px solid ${conjunto && !soloNudo ? c.azulBd : c.border}`, borderRadius: R.md }}>

      <div style={{ display: "flex", gap: SP.sm, alignItems: "center", flexWrap: "wrap",
        padding: `${SP.sm}px ${SP.md}px` }}>
        {conModo && (
          <div style={{ display: "flex", border: `1px solid ${c.border}`, borderRadius: R.sm + 2,
            overflow: "hidden" }}>
            {[[false, "Un nudo"], [true, "Conjunto (suma)"]].map(([v, rot]) => (
              <button key={rot} onClick={() => setConjunto(v)}
                style={{ border: "none", cursor: "pointer", padding: "5px 11px",
                  fontSize: TAM.base, fontWeight: conjunto === v ? 600 : 500, fontFamily: "inherit",
                  background: conjunto === v ? c.azulBg2 : "transparent",
                  color: conjunto === v ? c.txt : c.txt2 }}>
                {rot}
              </button>
            ))}
          </div>
        )}

        {(!conjunto || soloNudo) ? (<>
          <span style={t.eyebrow}>Nudo</span>
          <select style={{ ...s.sel, minWidth: 150 }} value={i < 0 ? 0 : i}
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
        </>) : (<>
          <span style={t.eyebrow}>Conjunto</span>
          <Badge tono="info" punto>
            {incluidos.length} de {nudos.length} nudos · cargas sumadas
          </Badge>
          <Ayuda>
            Las cargas de los nudos tildados se <b>suman hipótesis por hipótesis</b> y las tablas
            pasan a ser de la <b>resultante del conjunto</b>, que es lo que hay que equilibrar
            para la estabilidad global de la fundación.
            <br /><br />
            <b>Se supone que todas las resultantes actúan en el baricentro de la fundación</b>, de
            modo que no hace falta la posición en planta de cada nudo. La contrapartida es que el
            momento del conjunto es la suma de los momentos de los apoyos y no incluye el que
            generaría la distribución de las cargas verticales en planta: para un conjunto
            razonablemente simétrico es el criterio corriente, y para uno con las verticales
            netamente descentradas subestima el vuelco.
            <br /><br />
            Se suma <b>por hipótesis y no por combinación</b>: sumar combinaciones ya armadas
            mezclaría casos que no ocurren a la vez.
          </Ayuda>
        </>)}

        <div style={{ flex: 1 }} />
        <span style={{ ...t.micro, fontSize: TAM.base }}>
          {nudos.length} nudo{nudos.length > 1 ? "s" : ""} en el proyecto
        </span>
      </div>

      {conjunto && !soloNudo && (
        <div style={{ borderTop: `1px solid ${c.border}`, padding: `${SP.sm}px ${SP.md}px` }}>
          {/* ⚠ LA LISTA SE PLIEGA CUANDO HAY MUCHOS.
              Con cien nudos —un rack, una batería de soportes— las casillas ocupaban ocho
              renglones y trescientos píxeles de alto, y empujaban las tablas fuera de la
              pantalla en cada visita, aunque el caso normal sea no tocar ninguna. Medido.
              Con pocos se muestran directamente: plegar tres casillas es un clic de más para
              nada. */}
          <details open={nudos.length <= UMBRAL_PLEGADO}>
            <summary style={{ cursor: "pointer", listStyle: "none", display: "flex",
              alignItems: "center", gap: SP.sm, flexWrap: "wrap" }}>
              <span style={t.eyebrow}>Nudos sobre esta fundación</span>
              <span style={{ ...t.body, color: c.txt2 }}>
                {incluidos.length === nudos.length
                  ? `los ${nudos.length}`
                  : `${incluidos.length} de ${nudos.length} — ${nudos.filter(n => n.incluido === false).length} excluidos`}
              </span>
              {/* Con cien nudos, tildarlos de a uno no es una opción. */}
              <span onClick={e => e.preventDefault()} style={{ display: "inline-flex", gap: SP.xs }}>
                <button style={{ ...s.btnG, padding: "3px 9px" }}
                  onClick={() => todos(true)}>Todos</button>
                <button style={{ ...s.btnG, padding: "3px 9px" }}
                  onClick={() => todos(false)}>Ninguno</button>
              </span>
            </summary>
            {/* Una planilla suele traer TODOS los nudos del modelo, y esta fundación recibe
                unos pocos: por eso se eligen. Sumarlos todos por defecto sería meter en la
                cuenta apoyos de otra base. */}
            <div style={{ display: "flex", gap: `${SP.xs}px ${SP.md}px`, flexWrap: "wrap",
              alignItems: "center", marginTop: SP.sm,
              // Tope de alto con desplazamiento propio: con doscientos nudos, ni plegada la
              // lista puede empujar la página entera hacia abajo.
              maxHeight: 132, overflowY: "auto" }}>
              {nudos.map(n => (
                <label key={n.id} style={{ display: "inline-flex", alignItems: "center", gap: 5,
                  ...t.body, color: n.incluido === false ? c.txt3 : c.txt,
                  cursor: "pointer", whiteSpace: "nowrap" }}>
                  <input type="checkbox" checked={n.incluido !== false}
                    onChange={e => setIncluido(n.id, e.target.checked)} />
                  {n.nombre || "(sin nombre)"}
                </label>
              ))}
            </div>
          </details>
          {/* POSICIÓN EN PLANTA — plegada por defecto porque el caso corriente es no usarla, y
              en cero el resultado es idéntico al de siempre. Pero cuando hace falta, hace toda
              la diferencia: es la única forma de que el vuelco de una estructura con bases
              ARTICULADAS llegue a la fundación, porque ahí el momento de cada nudo es cero y
              todo el vuelco viaja en el desbalance de las verticales. */}
          <details open={!!suma?.conPos} style={{ marginTop: SP.sm }}>
            <summary style={{ cursor: "pointer", listStyle: "none", display: "flex",
              alignItems: "center", gap: SP.sm, flexWrap: "wrap" }}>
              <span style={t.eyebrow}>Posición en planta</span>
              <span style={{ ...t.body, color: suma?.conPos ? C.yellow : c.txt3 }}>
                {suma?.conPos
                  ? "cargada — la suma incluye N·x, N·y y la torsión Vy·x − Vx·y"
                  : "sin cargar — se supone que todo actúa en el eje de la fundación"}
              </span>
              <Ayuda txt={"Distancia con SIGNO de cada nudo al eje de la fundación, en metros (+X y +Y). "
                + "Con todo en cero, la suma es la de siempre. Cargala cuando las cargas verticales estén "
                + "netamente descentradas, y sobre todo cuando la estructura tenga las BASES ARTICULADAS: "
                + "ahí cada nudo entrega momento cero y el vuelco viaja como par de fuerzas verticales, "
                + "así que sin posiciones el conjunto informa vuelco nulo. Se aplica por hipótesis, de modo "
                + "que en peso propio los aportes se cancelan solos y en viento aparecen con su signo."} />
            </summary>
            <div style={{ marginTop: SP.sm, maxHeight: 168, overflowY: "auto" }}>
              <table style={{ borderCollapse: "collapse", ...t.body }}>
                <thead><tr>
                  {["Nudo", "x (m)", "y (m)"].map(h =>
                    <th key={h} style={{ ...t.eyebrow, textAlign: "left", padding: "2px 8px 4px 0" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {nudos.map(n => (
                    <tr key={n.id} style={{ opacity: n.incluido === false ? 0.45 : 1 }}>
                      <td style={{ padding: "2px 10px 2px 0", whiteSpace: "nowrap" }}>{n.nombre || "(sin nombre)"}</td>
                      {["x", "y"].map(eje => (
                        <td key={eje} style={{ padding: "2px 8px 2px 0" }}>
                          <input type="number" step="0.01" value={n.pos?.[eje] ?? 0}
                            onChange={e => setPos(n.id, eje, e.target.value)}
                            style={{ ...s.inp, width: 78, padding: "2px 6px" }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          {!!suma?.avisos?.length && (
            <div style={{ ...s.note, color: C.yellow, marginTop: SP.sm }}>
              {suma.avisos.map((a, k) => <div key={k}>⚠ {a}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
