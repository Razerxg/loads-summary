// RESUMEN POR HIPÓTESIS — la primera tabla que pide el trabajo.
//
// Una fila por hipótesis con las seis componentes tal como vinieron del modelo. Es a la vez
// la salida (lo que se mira y se copia a la memoria) y la ENTRADA de repuesto: los campos
// son editables, así que una planilla incompleta se termina de cargar acá sin volver a
// tocar el Excel.
//
// Se muestra desde la LISTA VIVA de hipótesis y no desde las claves que trajo la planilla:
// una hipótesis declarada y todavía sin datos aparece en blanco, con su aviso. Una fila
// vacía se ve; una fila ausente, no —y es la diferencia entre notar que falta el viento y
// emitir una memoria sin viento—.
import { s, C, MONO } from '../styles.js';
import { c, t, SP, R, TAM } from '../tokens.js';
import { Card, Boton, Badge, Ayuda, Divisor, Siguiente, useToast } from '../ui.jsx';
import { SelectorNudo } from '../SelectorNudo.jsx';
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { COMPONENTES, COMP_KEYS } from '../../constants/componentes.js';
import { rotuloHip, familiaHip, esPorNivel, CAT_POR_K, HIP_CAT } from '../../constants/hipotesis.js';
import { useState } from 'react';

const CELDA = { width: 82, padding: "3px 5px", fontSize: TAM.base, textAlign: "right" };

// El tinte de la familia ordena la lista sin necesidad de agruparla: los permanentes juntos
// arriba, las accidentales marcadas. Es color como SEÑAL, no como decoración.
const TONO_FAM = { permanente: "neutro", variable: "info", accidental: "aviso", otra: "neutro" };

export function HipotesisTab() {
  const { hips, nudoAct, setCarga, addHips, delHip, irA } = useProyecto();
  const toast = useToast();
  const [nueva, setNueva] = useState("");

  const cargas = nudoAct?.cargas || {};
  // `Ds` —y cualquier otra hipótesis `porNivel`— no se edita acá: su valor no es del nudo
  // sino de la cota, y ofrecerla como un campo más de esta tabla invitaría a cargar el peso
  // de la zapata a una altura donde la fundación todavía no existe.
  const editables = hips.filter(h => !esPorNivel(h));
  const deNivel = hips.filter(h => esPorNivel(h));
  const sinDatos = editables.filter(h => !cargas[h]);

  const agregar = () => {
    const k = nueva.trim();
    if (!k) return;
    const puestas = addHips([k]);
    if (!puestas.length) { toast(`«${k}» ya estaba en la lista.`, "aviso"); return; }
    toast(`Agregada la hipótesis «${k}».`, "ok");
    setNueva("");
  };

  return (<>
    <SelectorNudo conEditar soloNudo />

    <Card titulo="Esfuerzos por hipótesis"
      desc="Lo que entregó el modelo, sin combinar. Los campos son editables: lo que la planilla no haya traído se completa acá.">
      <div style={{ overflowX: "auto" }}>
        <table className="bx-tabla" style={s.table}>
          <thead><tr>
            <th style={{ ...s.th, textAlign: "left", minWidth: 190 }}>Hipótesis</th>
            {COMPONENTES.map(cm => (
              <th key={cm.k} style={s.th}>
                <span title={cm.tip}>{cm.rot}</span><br />
                <span style={{ ...t.micro, fontWeight: 400 }}>{cm.uni}</span>
              </th>
            ))}
            <th style={{ ...s.th, width: 34 }}></th>
          </tr></thead>
          <tbody>
            {editables.map(h => {
              const c0 = cargas[h] || {};
              const vacia = !cargas[h];
              return (
                <tr key={h}>
                  <td style={{ ...s.tdL, whiteSpace: "nowrap" }}>
                    <span style={{ fontWeight: 600, color: c.txt }}>{h}</span>
                    <span style={{ ...t.micro, marginLeft: 8 }}>
                      {CAT_POR_K[h] ? rotuloHip(h) : "hipótesis del modelo"}
                    </span>
                    {familiaHip(h) === "accidental" && (
                      <span style={{ marginLeft: 6 }}><Badge tono="aviso">accidental</Badge></span>
                    )}
                  </td>
                  {COMP_KEYS.map(k => (
                    <td key={k} style={{ ...s.td, padding: "2px 3px" }}>
                      <input className="bx-in" type="number" step="any"
                        style={{ ...s.inp, ...CELDA,
                          // Una hipótesis sin ningún dato se ve distinta de una en ceros: la
                          // primera hay que completarla, la segunda es un resultado del modelo.
                          borderColor: vacia ? c.ambarBd : undefined }}
                        value={c0[k] ?? ""} placeholder="—"
                        aria-label={`${h} ${k}`}
                        onChange={e => setCarga(nudoAct.id, h, k, e.target.value)} />
                    </td>
                  ))}
                  <td style={{ ...s.td, padding: "2px 1px" }}>
                    <button style={s.btnR} title={`Quitar ${h} del proyecto`}
                      onClick={() => { delHip(h); toast(`Se quitó «${h}» y su factor en todas las combinaciones.`, "ok"); }}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!!sinDatos.length && (
        <div style={{ ...s.note, color: C.yellow }}>
          ⚠ Sin datos en este nudo: <b>{sinDatos.join(", ")}</b>. Si alguna entra en una
          combinación con factor distinto de cero, esa combinación va a salir sin esa parte y
          el total va a parecer correcto igual. En Resultados se listan cuáles.
        </div>
      )}

      <Divisor>Agregar una hipótesis</Divisor>
      <div style={{ display: "flex", gap: SP.sm, alignItems: "center", flexWrap: "wrap" }}>
        <input className="bx-in" style={{ ...s.inp, width: 180, fontFamily: "inherit" }}
          value={nueva} onChange={e => setNueva(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") agregar(); }}
          placeholder="p. ej. V(90°)H1" aria-label="Nombre de la hipótesis nueva" />
        <Boton onClick={agregar} disabled={!nueva.trim()}>+ Agregar</Boton>
        <select style={s.sel} value="" onChange={e => { if (e.target.value) { addHips([e.target.value]); toast(`Agregada «${e.target.value}».`, "ok"); } }}>
          <option value="">…o traer una del catálogo</option>
          {HIP_CAT.filter(h => !hips.includes(h.k) && !h.porNivel).map(h => (
            <option key={h.k} value={h.k}>{h.k} — {h.rotulo}</option>
          ))}
        </select>
        <Ayuda>
          La lista de hipótesis es <b>del proyecto</b>, no del programa: podés poner el nombre
          que use tu modelo. Las que estén en el catálogo traen su rótulo en palabras y quedan
          marcadas como accidentales si corresponde; el resto entra con su nombre tal cual.
          <br /><br />
          Las nuevas van <b>al final</b>, así que las columnas de la matriz de combinaciones
          que ya tengas escritas no se mueven.
        </Ayuda>
      </div>
      <div style={s.note}>
        {editables.length} hipótesis del nudo · quitar una borra <b>también su factor</b> en todas las
        combinaciones. Sin eso, el factor quedaba escondido en el objeto: la columna
        desaparecía de la pantalla pero la hipótesis seguía sumando al total.
      </div>
    </Card>

    {!!deNivel.length && (
      <Card titulo="Hipótesis que no se cargan acá">
        <div style={{ ...t.body, color: c.txt }}>
          <code>{deNivel.join(", ")}</code> {deNivel.length > 1 ? "tienen" : "tiene"} su valor
          definido <b>por nivel</b>, no por nudo, así que no {deNivel.length > 1 ? "aparecen" : "aparece"} en
          la tabla de arriba. <code>Ds</code> es el peso propio de la fundación: por encima del
          nudo no hay fundación, y a cada cota hay lo que haya entre esa cota y el nudo. Se carga
          en <b>Niveles</b>, y su columna <code>φDs</code> sí está en la matriz de combinaciones.
        </div>
        <div style={{ marginTop: SP.md }}>
          <Boton onClick={() => irA("Niveles")}>Ir a Niveles →</Boton>
        </div>
      </Card>
    )}

    <Siguiente irA={irA} atras="Importar" a="Combinaciones"
      txt="Con las hipótesis cargadas:" />
  </>);
}
