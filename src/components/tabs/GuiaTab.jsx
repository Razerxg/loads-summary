// GUÍA — qué hace la app, qué no hace, y los tres criterios que hay que conocer para
// poder revisar un número que salga de acá.
import { s, C, MONO } from '../styles.js';
import { c, t, SP, R, TAM } from '../tokens.js';
import { Card, Boton, Badge, Divisor, Stat } from '../ui.jsx';
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { COMPONENTES } from '../../constants/componentes.js';

const Paso = ({ n, titulo, children, ir }) => (
  <div style={{ display: "flex", gap: SP.md, marginBottom: SP.md }}>
    <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: R.full,
      background: c.azulBg2, border: `1px solid ${c.azulBd}`, color: c.azulL,
      display: "flex", alignItems: "center", justifyContent: "center", ...t.num, fontWeight: 700 }}>
      {n}
    </div>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ ...t.bodyF, color: c.txt, marginBottom: 2 }}>{titulo}</div>
      <div style={{ ...t.body }}>{children}</div>
      {ir && <div style={{ marginTop: SP.sm }}>{ir}</div>}
    </div>
  </div>
);

export function GuiaTab() {
  const { irA, hips, nudos, combosU, combosS, niveles, proyecto, set } = useProyecto();

  return (<>
    <Card titulo="Para qué sirve"
      desc="Volcar la tabla de reacciones de CYPE y salir con los esfuerzos totales de cada combinación, en el nudo y a las profundidades que hagan falta.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
        gap: SP.md, marginBottom: SP.lg }}>
        <Stat label="Hipótesis" valor={hips.length} />
        <Stat label="Nudos" valor={nudos.length} />
        <Stat label="Combinaciones" valor={combosU.length + combosS.length}
          sub={`${combosU.length} ELU · ${combosS.length} ELS`} />
        <Stat label="Niveles" valor={niveles.length} sub="incluido el nudo" />
      </div>

      <div style={s.row}>
        <span style={s.lbl}>Nombre del proyecto</span>
        <input className="bx-in" style={{ ...s.inp, width: 280, fontFamily: "inherit" }}
          value={proyecto} placeholder="opcional — sale en los CSV"
          onChange={e => set({ proyecto: e.target.value })} />
      </div>
    </Card>

    <Card titulo="El recorrido">
      <Paso n={1} titulo="Importar la planilla"
        ir={<Boton variante="primario" onClick={() => irA("Importar")}>Ir a Importar →</Boton>}>
        El <code>.xlsx</code> de CYPE tal cual, o el bloque pegado. Se reconocen los nombres de
        CYPE, la columna «Referencia» combinada y los nudos uno abajo del otro. Una hipótesis
        que la app no conozca <b>no se descarta</b>: se propone agregarla.
      </Paso>
      <Paso n={2} titulo="Revisar el resumen por hipótesis"
        ir={<Boton onClick={() => irA("Hipótesis")}>Ir a Hipótesis →</Boton>}>
        Una fila por hipótesis con las seis componentes. Es editable, así que lo que la planilla
        no haya traído se completa acá sin volver al Excel.
      </Paso>
      <Paso n={3} titulo="Armar el criterio de combinación"
        ir={<Boton onClick={() => irA("Combinaciones")}>Ir a Combinaciones →</Boton>}>
        Dos matrices, ELU y ELS. Vienen con un set patrón y se pueden cargar los de CIRSOC 201,
        ACI 318-19 / ASCE 7-16 y PIP STC01015, o traer un <code>.combos.json</code> guardado
        —incluso uno exportado desde la app de bases—.
      </Paso>
      <Paso n={4} titulo="Declarar las profundidades"
        ir={<Boton onClick={() => irA("Niveles")}>Ir a Niveles →</Boton>}>
        Cada nivel genera su propio juego de tablas con los momentos ya trasladados. El nudo
        siempre está, y no se puede borrar: es la referencia.
      </Paso>
      <Paso n={5} titulo="Leer y exportar"
        ir={<Boton onClick={() => irA("Resultados")}>Ir a Resultados →</Boton>}>
        Los totales de cada combinación por nivel, con la envolvente y el nombre de la
        combinación que la produce. Un CSV por nivel, listo para Excel en español.
      </Paso>
    </Card>

    <Card titulo="Los tres criterios que hay que conocer" tono="aviso">
      <div style={{ ...t.body, color: c.txt }}>
        <b>1 · Ejes y signos.</b> X longitudinal, Y transversal, Z vertical hacia arriba.
        <code> N</code> es positiva en <b>compresión</b> sobre el apoyo. El importador traduce el
        NOMBRE de las columnas de CYPE (<code>Rz→N</code>, <code>Rx→Vx</code>, <code>My→Myy</code>)
        pero <b>no el signo</b>: si tu modelo da la reacción vertical positiva hacia arriba, hay
        que invertirla. Ningún control automático distingue un signo mal de una tracción real.
        <br /><br />
        <b>2 · El peso propio acompaña al peso de estado.</b> CYPE entrega el peso propio como
        hipótesis aparte (<code>PP</code>), así que una combinación que diga sólo
        <code> 1,20·Do</code> deja afuera el peso de la estructura. Los sets de esta app llevan
        <code> PP</code> con el mismo factor que el peso que acompañan.
        <br /><br />
        <b>3 · El traslado suma con signo.</b> <code>Myy′ = Myy + Vx·h</code> y
        <code> Mxx′ = Mxx + Vy·h</code>, sin valores absolutos: es el criterio de
        <code> bases</code> y <code>soporte-elevado</code>, y se mantiene igual para que las tres
        apps se puedan pasar números. Si los signos de la planilla no son de fiar, en Niveles hay
        un modo de <b>envolvente conservadora</b> que hace crecer el momento siempre.
      </div>
    </Card>

    <Card titulo="Qué NO hace">
      <div style={{ ...t.body, color: c.txt }}>
        <b>No verifica nada.</b> No calcula tensiones sobre el terreno, ni vuelco, ni
        deslizamiento, ni armaduras, ni la columna. Resume, combina y traslada: los números que
        salen de acá son la <i>entrada</i> de esas verificaciones, que viven en las apps de bases
        y de soporte elevado.
        <br /><br />
        <b>No agrega peso al bajar de nivel.</b> El traslado cambia los momentos por el brazo del
        corte y nada más. El peso del pedestal, de la zapata y del suelo que gravita encima no se
        suma acá: lo calcula la app que dimensiona la fundación, a partir de su geometría, y
        sumarlo en los dos lados sería contarlo dos veces.
        <br /><br />
        <b>No decide qué combinación gobierna.</b> Da la envolvente y de dónde sale cada extremo;
        cuál corresponde a cada verificación lo decide quien recibe estos números.
      </div>
    </Card>

    <Card titulo="Las seis componentes">
      <table className="bx-tabla" style={s.table}>
        <thead><tr>
          <th style={{ ...s.th, textAlign: "left", width: 80 }}>Símbolo</th>
          <th style={{ ...s.th, width: 70 }}>Unidad</th>
          <th style={{ ...s.th, textAlign: "left" }}>Qué es</th>
        </tr></thead>
        <tbody>
          {COMPONENTES.map(cm => (
            <tr key={cm.k}>
              <td style={{ ...s.tdL, fontFamily: MONO, fontWeight: 700, color: c.txt }}>{cm.rot}</td>
              <td style={{ ...s.td, color: c.txt2 }}>{cm.uni}</td>
              <td style={{ ...s.tdL, color: c.txt2 }}>{cm.tip}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={s.note}>
        El <b>torsor se conserva</b>. La app de bases lo descarta —una fundación directa no se
        verifica a torsión— pero acá no se verifica nada: tirar una columna que el usuario cargó
        sería perder un dato suyo, y el torsor es justamente el que hace falta cuando estas
        reacciones van después a un anclaje o a una ménsula.
      </div>
    </Card>
  </>);
}
