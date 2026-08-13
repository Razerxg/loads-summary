// RESULTADOS — los totales por combinación, un juego de tablas por nivel.
//
// Es la pantalla que la app existe para producir. Cada nivel trae:
//   · el resumen por hipótesis trasladado a esa cota;
//   · los totales de cada combinación ELU y de cada ELS;
//   · la envolvente de cada set, con el NOMBRE de la combinación que la produce.
//
// EL NOMBRE DE LA COMBINACIÓN ES LA MITAD DEL VALOR. Un `Myy` máximo de 84 kN·m no sirve
// para nada si hay que recorrer treinta filas para encontrar de cuál salió; la envolvente
// sin su origen obliga a rehacer la búsqueda a mano cada vez.
import { useState } from 'react';
import { s, C, MONO } from '../styles.js';
import { c, t, SP, R, TAM } from '../tokens.js';
import { Card, Boton, Badge, Ayuda, Divisor, Stat, Acordeon, useToast } from '../ui.jsx';
import { DataTable } from '../DataTable.jsx';
import { SelectorNudo } from '../SelectorNudo.jsx';
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { COMPONENTES, COMP_KEYS } from '../../constants/componentes.js';
import { MODOS, rotuloNivel } from '../../engine/traslado.js';
import { csvDeNivel, descargar } from '../../services/exportarCsv.js';
import { f2 } from '../../engine/utils.js';

// Las columnas de una tabla de esfuerzos. Se arman una vez y se reusan en las tres tablas
// del nivel: que el resumen por hipótesis y los totales por combinación tengan exactamente
// las mismas columnas, en el mismo orden y con el mismo ancho, es lo que permite compararlas
// de un vistazo sin leer los encabezados otra vez.
const colsEsf = (primera) => [
  { k: "nombre", titulo: primera, ancho: 150 },
  ...COMPONENTES.map(cm => ({ k: cm.k, titulo: `${cm.rot} [${cm.uni}]`, num: true, tip: cm.tip })),
  { k: "expr", titulo: "Expresión", oculta: true },
];

const celdasDe = (esf) => Object.fromEntries(COMP_KEYS.map(k => [k, { v: esf[k], txt: f2(esf[k]) }]));

function TablaCombos({ titulo, filas, env, pref }) {
  return (
    <>
      <div style={{ ...t.eyebrow, color: c.azulL, margin: `${SP.lg}px 0 ${SP.sm}px` }}>{titulo}</div>
      <DataTable
        cols={colsEsf("Combinación")}
        maxAlto={420}
        filas={filas.map(f => ({
          k: f.k,
          celdas: {
            nombre: {
              v: f.nombre,
              txt: <span style={{ whiteSpace: "nowrap" }}>
                <b style={{ color: c.azulL }}>{f.nombre}</b>
                {f.accidental && <span style={{ ...t.micro, marginLeft: 5 }} title="con acción accidental">ᴬ</span>}
                {!!f.faltan.length && (
                  <span style={{ ...t.micro, marginLeft: 5, color: c.ambar }}
                    title={`Con factor pero sin cargas en este nudo: ${f.faltan.join(", ")}`}>⚠</span>
                )}
              </span>,
            },
            ...celdasDe(f.esf),
            expr: f.expr,
          },
        }))}
        pie={<>Las filas con <b style={{ color: c.ambar }}>⚠</b> llevan alguna hipótesis con factor
          distinto de cero que no tiene cargas en este nudo: el total sale sin esa parte y parece
          correcto igual. La columna <b>Expresión</b> está oculta —se muestra desde «Columnas»—
          para poder verificar de dónde sale cada fila.</>}
      />
      {/* La envolvente va en una tabla APARTE y no como dos filas al pie de la anterior:
          dentro de la misma tabla, ordenar por una columna las mezclaba con las
          combinaciones y dejaban de leerse como lo que son. */}
      <table className="bx-tabla" style={{ ...s.table, marginTop: SP.sm }}>
        <thead><tr>
          <th style={{ ...s.th, textAlign: "left", width: 150 }}>Envolvente</th>
          {COMPONENTES.map(cm => <th key={cm.k} style={s.th}>{cm.rot}</th>)}
        </tr></thead>
        <tbody>
          {[["Máximo", "max"], ["Mínimo", "min"]].map(([rot, kk]) => (
            <tr key={kk}>
              <td style={{ ...s.tdL, fontWeight: 600 }}>{rot}</td>
              {COMP_KEYS.map(k => (
                <td key={k} style={s.td}>
                  {f2(env[k][kk].v)}
                  <div style={{ ...t.micro, fontSize: TAM.base }}>{env[k][kk].en}</div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function BloqueNivel({ r, abierto }) {
  const { proyecto, nudoAct, modo } = useProyecto();
  const toast = useToast();
  const esRef = !!r.nivel.fijo;

  const exportar = () => {
    const nom = `${(proyecto || "reacciones").replace(/\s+/g, "_")}_${(nudoAct?.nombre || "nudo")}`
      + `_${esRef ? "nudo" : `h${f2(r.nivel.h).replace(".", "-")}`}.csv`;
    descargar(nom, csvDeNivel({
      proyecto, nudo: nudoAct?.nombre || "", nivel: r.nivel, modo: MODOS[modo].label,
      comps: COMPONENTES, hipotesis: r.hipotesis, elu: r.elu, els: r.els,
      envELU: r.envELU, envELS: r.envELS,
    }));
    toast(`Exportado ${nom}`, "ok");
  };

  return (
    <Card
      titulo={rotuloNivel(r.nivel)}
      desc={esRef
        ? "Los esfuerzos tal como los entregó el modelo, sin trasladar. Es la referencia contra la que se comparan los demás niveles."
        : `Trasladado ${f2(r.nivel.h)} m por debajo del nudo, ${MODOS[modo].corto}. Las fuerzas no cambian; los momentos sí.`
          + (r.ds ? ` Incluye Ds = ${f2(r.ds)} kN de peso propio de fundación, con su factor por combinación.` : "")}
      acciones={<Boton onClick={exportar}>⤓ CSV</Boton>}
    >
      {r.sinDs && (
        <div style={{ marginBottom: SP.md, padding: SP.md, borderRadius: R.md,
          background: c.ambarBg, border: `1px solid ${c.ambarBd}`, ...t.body, color: c.txt }}>
          ⚠ Las combinaciones usan <code>Ds</code> pero este nivel tiene el peso propio de la
          fundación <b>en cero</b>. A una cota por debajo del nudo eso casi nunca es correcto: la
          zapata y el suelo que gravita encima pesan, y sin ellos el <code>N</code> sale menor —y
          perfectamente plausible—. Cargalo en <b>Niveles</b>, o poné <code>φDs</code> en cero si
          de verdad no corresponde.
        </div>
      )}
      <Acordeon titulo="Esfuerzos por hipótesis en este nivel"
        resumen={`${r.hipotesis.length} hipótesis`} abierto={false}>
        <DataTable cols={colsEsf("Hipótesis")} buscar={false} maxAlto={360}
          filas={r.hipotesis.map(h => ({
            k: h.hip,
            celdas: {
              nombre: {
                v: h.hip,
                txt: <span style={{ whiteSpace: "nowrap" }}>
                  <b>{h.hip}</b>
                  {h.sinDatos && <span style={{ ...t.micro, marginLeft: 6, color: c.ambar }}>sin datos</span>}
                </span>,
              },
              ...celdasDe(h.esf),
              expr: "",
            },
          }))} />
      </Acordeon>

      <TablaCombos titulo="Combinaciones últimas (ELU)" filas={r.elu} env={r.envELU} pref="ELU" />
      <TablaCombos titulo="Combinaciones en servicio (ELS)" filas={r.els} env={r.envELS} pref="ELS" />
    </Card>
  );
}

export function ResultadosTab() {
  const { porNivel, modo, hips, nudoAct, irA } = useProyecto();
  const conCargas = Object.keys(nudoAct?.cargas || {}).length;
  const faltantes = [...new Set(porNivel.flatMap(r => r.faltantes))];
  const vacias = [...new Set(porNivel.flatMap(r => r.vacias))];

  return (<>
    <SelectorNudo />

    {!conCargas && (
      <Card tono="aviso">
        <div style={{ ...t.body, color: c.txt }}>
          Este nudo no tiene ninguna carga cargada, así que todas las combinaciones dan cero.
          Traé la planilla en <b>Importar</b> o cargá los valores a mano en <b>Hipótesis</b>.
        </div>
      </Card>
    )}

    {(!!faltantes.length || !!vacias.length) && (
      <Card tono="aviso" titulo="Revisá esto antes de usar los números">
        {!!faltantes.length && (
          <div style={{ ...t.body, color: c.txt, marginBottom: SP.sm }}>
            <b>Hipótesis con factor pero sin cargas en este nudo:</b>{" "}
            <code>{faltantes.join(", ")}</code>.<br />
            Las combinaciones que las usan se calculan <b>sin esa parte</b> y el total tiene la
            pinta exacta de un resultado correcto. O las cargás, o les ponés factor cero.
          </div>
        )}
        {!!vacias.length && (
          <div style={{ ...t.body, color: c.txt }}>
            <b>Combinaciones sin ninguna hipótesis:</b> <code>{vacias.join(", ")}</code>. Dan todo
            cero y entran igual en la envolvente.
          </div>
        )}
      </Card>
    )}

    <Card titulo="Cómo leer estas tablas">
      <div style={{ ...t.body, color: c.txt }}>
        Hay un bloque <b>por nivel</b>: el nudo del modelo primero y las profundidades después,
        de menor a mayor. Dentro de cada uno, el resumen por hipótesis (plegado), los totales de
        cada combinación y la <b>envolvente</b> con el nombre de la combinación que la produce.
        <br /><br />
        El criterio de traslado vigente es <b>{MODOS[modo].label}</b>; se cambia en la pestaña
        Niveles y todas las tablas se recalculan. Los CSV que exportes llevan el nudo, el nivel,
        la profundidad y el criterio en el encabezado, porque un momento trasladado sin esos
        cuatro datos al lado no se puede revisar después.
      </div>
    </Card>

    {porNivel.map((r, i) => <BloqueNivel key={r.nivel.id} r={r} abierto={i === 0} />)}
  </>);
}
