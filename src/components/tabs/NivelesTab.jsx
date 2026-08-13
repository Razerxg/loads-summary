// NIVELES — a qué profundidades trasladar los esfuerzos.
//
// El nudo del modelo está donde termina el modelo: la cara superior de la fundación, el tope
// del pedestal, el nivel de placa base. El que dimensiona necesita los mismos esfuerzos
// abajo —fondo de zapata, cota de desplante, arranque de pilote— y ahí los momentos crecen,
// porque el corte pasa a actuar con un brazo.
//
// Es una LISTA y no un campo único a propósito: en una fundación real hacen falta dos o tres
// cotas, y con un solo campo habría que cambiarlo y volver a mirar la tabla, comparando de
// memoria. Con la lista, Resultados las muestra una debajo de la otra.
import { s, C, MONO } from '../styles.js';
import { c, t, SP, R, TAM } from '../tokens.js';
import { Card, Boton, Badge, Ayuda, Divisor, Siguiente } from '../ui.jsx';
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { MODOS, NIVEL_REF } from '../../engine/traslado.js';
import { PAR_TRASLADO } from '../../constants/componentes.js';
import { f2 } from '../../engine/utils.js';

export function NivelesTab() {
  const { niveles, addNivel, setNivel, delNivel, modo, set, irA } = useProyecto();
  const extra = niveles.filter(n => !n.fijo);

  return (<>
    <Card titulo="Qué hace el traslado">
      <div style={{ ...t.body, color: c.txt }}>
        Bajar <code>h</code> metros no cambia las fuerzas, pero sí los momentos: el corte, con
        un brazo <code>h</code>, agrega <code>V·h</code>.
        <div style={{ margin: `${SP.md}px 0`, padding: SP.md, background: c.surface,
          border: `1px solid ${c.border}`, borderRadius: R.md, fontFamily: MONO,
          ...t.num, lineHeight: 2, overflowX: "auto", whiteSpace: "nowrap" }}>
          N′ = N &nbsp;·&nbsp; Vx′ = Vx &nbsp;·&nbsp; Vy′ = Vy<br />
          Myy′ = Myy + Vx·h &nbsp;·&nbsp; Mxx′ = Mxx + Vy·h &nbsp;·&nbsp; T′ = T
        </div>
        <b>El torsor no cambia, y no es un olvido.</b> Trasladar un punto a lo largo del eje
        vertical no genera torsión: el brazo es paralelo al eje del torsor. Las fuerzas
        horizontales generan momento de <i>vuelco</i> al bajar, no de torsión. Habría torsión si
        el punto se corriera en planta —una excentricidad—, que es otro traslado y no el que
        hace esta app.
      </div>
    </Card>

    <Card titulo="Criterio de signos"
      desc="Es la decisión de fondo del traslado y la tabla de resultados dice siempre con cuál está calculada.">
      {Object.entries(MODOS).map(([k, m]) => (
        <label key={k} style={{ display: "flex", gap: SP.sm, alignItems: "flex-start",
          padding: SP.md, marginBottom: SP.sm, cursor: "pointer",
          background: modo === k ? c.azulBg : "transparent",
          border: `1px solid ${modo === k ? c.azulBd : c.border}`, borderRadius: R.md }}>
          <input type="radio" name="modo" checked={modo === k} onChange={() => set({ modo: k })}
            style={{ marginTop: 3 }} />
          <span>
            <span style={{ ...t.bodyF, color: c.txt }}>{m.label}</span>
            <div style={{ ...t.body, marginTop: 2 }}>{m.desc}</div>
          </span>
        </label>
      ))}
      <div style={s.note}>
        El modo <b>con signo</b> es el mismo criterio que usan <code>bases</code> y
        <code> soporte-elevado</code> (<code>M_NF = M_pb + V·h</code>). Se mantiene igual a
        propósito: las tres apps se pasan números entre sí, y si una sumara y la otra restara, el
        mismo modelo daría dos memorias distintas y nadie sabría cuál mirar.
        <br /><br />
        Supone que los momentos y los cortes vienen con signos <b>coherentes entre sí</b>, que es
        lo que pasa cuando salen del mismo análisis. Si no lo fueran, <code>M + V·h</code> puede
        restar y devolver un momento menor que el de arriba: eso no es conservador y no se
        distingue a ojo de un caso legítimo en que el corte descarga el momento. Para ese caso
        está la envolvente.
      </div>
    </Card>

    <Card titulo="Profundidades"
      desc="Cada nivel genera su propio juego de tablas en Resultados."
      acciones={<Boton variante="primario" onClick={addNivel}>+ Nivel</Boton>}>
      <table className="bx-tabla" style={s.table}>
        <thead><tr>
          <th style={{ ...s.th, textAlign: "left" }}>Nombre</th>
          <th style={{ ...s.th, width: 110 }}>h <span style={{ ...t.micro, fontWeight: 400 }}>(m)</span></th>
          <th style={{ ...s.th, width: 120 }}>Ds <span style={{ ...t.micro, fontWeight: 400 }}>(kN)</span></th>
          <th style={{ ...s.th, textAlign: "left" }}>Brazo que agrega</th>
          <th style={{ ...s.th, width: 34 }}></th>
        </tr></thead>
        <tbody>
          <tr>
            <td style={{ ...s.tdL }}>
              <b>{NIVEL_REF.nombre}</b>
              <span style={{ marginLeft: 8 }}><Badge tono="info">fijo</Badge></span>
            </td>
            <td style={s.td}>0,00</td>
            {/* El nudo NO lleva Ds y el campo ni siquiera se ofrece: por encima del nudo no
                hay fundación. Dejarlo editable invitaría a cargar ahí el peso de la zapata,
                que es justo el error de contar la fundación a una cota donde todavía no
                existe. */}
            <td style={{ ...s.td, color: c.txt3 }}>—</td>
            <td style={{ ...s.tdL, color: c.txt3 }}>— (es la referencia)</td>
            <td style={s.td}></td>
          </tr>
          {extra.map(nv => (
            <tr key={nv.id}>
              <td style={{ ...s.tdL, padding: "2px 6px" }}>
                <input className="bx-in" style={{ ...s.inp, width: 190, fontFamily: "inherit" }}
                  value={nv.nombre} aria-label="Nombre del nivel"
                  placeholder="p. ej. Fondo de zapata"
                  onChange={e => setNivel(nv.id, { nombre: e.target.value })} />
              </td>
              <td style={{ ...s.td, padding: "2px 3px" }}>
                <input className="bx-in" type="number" step="any"
                  style={{ ...s.inp, width: 84, textAlign: "right" }}
                  value={nv.h} aria-label="Profundidad en metros"
                  onChange={e => setNivel(nv.id, { h: e.target.value === "" ? 0 : Number(e.target.value) })} />
              </td>
              <td style={{ ...s.td, padding: "2px 3px" }}>
                <input className="bx-in" type="number" step="any"
                  style={{ ...s.inp, width: 94, textAlign: "right",
                    borderColor: !Number(nv.ds) ? c.ambarBd : undefined }}
                  value={nv.ds ?? 0} aria-label="Peso propio de la fundación en kN" placeholder="0"
                  onChange={e => setNivel(nv.id, { ds: e.target.value === "" ? 0 : Number(e.target.value) })} />
              </td>
              <td style={{ ...s.tdL, fontFamily: MONO, color: c.txt2, whiteSpace: "nowrap" }}>
                {Object.entries(PAR_TRASLADO)
                  .map(([m, v]) => `${m} + ${v}·${f2(Number(nv.h) || 0)}`).join("  ·  ")}
              </td>
              <td style={{ ...s.td, padding: "2px 1px" }}>
                <button style={s.btnR} onClick={() => delNivel(nv.id)} title="eliminar">✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!extra.length && (
        <div style={s.note}>
          Todavía no hay ninguno. Sin niveles, Resultados muestra sólo los esfuerzos en el nudo
          tal como los entregó el modelo, que es un uso legítimo de la app.
        </div>
      )}
      <div style={s.note}>
        <b>La profundidad es positiva hacia abajo</b> y se mide desde el nudo del modelo. Un
        valor negativo levanta el punto y hace decrecer los momentos: se acepta —a veces hace
        falta— pero revisá que sea lo que querías.
      </div>
    </Card>

    <Card titulo="Ds — el peso propio de la fundación" tono="aviso">
      <div style={{ ...t.body, color: c.txt }}>
        <b>La planilla de CYPE nunca lo trae, y no es un defecto del importador:</b> el modelo
        termina en el nudo, que es la cara superior de la fundación. La zapata, el pedestal y el
        suelo que gravita encima existen <i>por debajo</i> de ese punto, así que aparecen recién
        cuando las cargas se bajan a la cota de desplante.
        <br /><br />
        Por eso <code>Ds</code> es una propiedad <b>del nivel</b> y no del nudo: a 0,00 m no hay
        nada de fundación arriba, y a {extra.length ? f2(Number(extra[0].h) || 0) : "1,50"} m hay
        todo lo que haya entre las dos cotas. Cargalo en kN, <b>positivo</b>: en esta app
        <code> N</code> es positiva en compresión, y el peso de la fundación comprime.
        <div style={{ margin: `${SP.md}px 0`, padding: SP.md, background: c.surface,
          border: `1px solid ${c.border}`, borderRadius: R.md, fontFamily: MONO,
          ...t.num, lineHeight: 1.9, overflowX: "auto" }}>
          Ds = γ_H° · Vol_hormigón &nbsp;+&nbsp; γ_suelo · Vol_suelo sobre la zapata
        </div>
        <b>Entra en las combinaciones con su propio factor.</b> No se suma al final: es una
        carga permanente más, así que la matriz le aplica 1,4 donde va 1,4 y <b>0,9 en las de
        levantamiento</b>, que es donde minorarla es lo conservador. Los sets de esta app ya
        traen la columna <code>φDs</code> con el mismo factor que <code>φPP</code>.
        <br /><br />
        <b style={{ color: c.ambar }}>Dos límites que conviene tener presentes.</b> Se supone
        que la resultante del peso pasa por el punto donde se miden los esfuerzos, o sea que
        <b> no genera momento</b>: es lo correcto para una zapata simétrica bajo el pedestal, y
        no lo es para una fundación excéntrica, que agregaría <code>N·e</code>. Y el empuje
        <b> hacia arriba del agua</b> —subpresión, si hay napa por encima del plano de
        fundación— tampoco está: si corresponde, descontalo del valor que cargues acá.
      </div>
    </Card>

    <Siguiente irA={irA} atras="Combinaciones" a="Resultados"
      txt="Ya está todo definido:" />
  </>);
}
