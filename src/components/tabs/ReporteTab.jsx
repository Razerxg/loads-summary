// PESTAÑA REPORTE — las tablas con formato de memoria de cálculo.
//
// Existe por un motivo concreto: las tablas de Resultados están pensadas para MIRARSE en
// pantalla —fondo oscuro, orden por columna, buscador, columnas ocultables— y nada de eso
// sobrevive a un copiar y pegar en un Word. Acá las mismas cifras salen sobre papel blanco,
// en Arial, con bordes de trama fina y numeradas «Tabla N° x», que es como están en las
// memorias de las otras dos apps y como se espera que entren en un documento emitido.
//
// EL ESTILO `R` ES EL MISMO OBJETO QUE EN `bases-v-0.1`, a propósito y hasta en los valores
// de gris. Si estas tablas se pegan al lado de las de una memoria de bases y no coinciden
// —otro borde, otro relleno de encabezado, otro tamaño— el documento se lee como armado con
// pedazos de programas distintos, que es exactamente lo que se quiere evitar.
//
// ── LO QUE SE COPIA ES EL DOM VIVO ──────────────────────────────────────────────
//
// No hay una segunda representación de la memoria en HTML de cadena. Copiar y bajar el .doc
// leen el nodo real que está en pantalla, así que lo que se pega es literalmente lo que se
// ve. Tener dos versiones —una para mirar y otra para exportar— es garantía de que un día
// van a diferir y nadie va a notarlo hasta que el número esté en un plano.
import { useRef } from 'react';
import { useProyecto } from '../../context/ProyectoContext.jsx';
import { copiarNodo, exportarWord } from '../../services/exportWord.js';
import { Card, Boton, useToast, Ayuda } from '../ui.jsx';
import { SelectorNudo } from '../SelectorNudo.jsx';
import { c, t, SP, R as RAD, TAM } from '../tokens.js';
import { s } from '../styles.js';
import { COMPONENTES, COMP_KEYS } from '../../constants/componentes.js';
import { rotuloHip, familiaHip, esPorNivel, comboDesc, comboDescNatural,
  HIP_DS, CAT_POR_K } from '../../constants/hipotesis.js';
import { MODOS, rotuloNivel } from '../../engine/traslado.js';
import { PAR_TRASLADO } from '../../constants/componentes.js';
import { f2, num } from '../../engine/utils.js';

// ── ESTILOS DE MEMORIA ──────────────────────────────────────────────────────────
// Colores en HEXADECIMAL LITERAL, no tokens. La memoria se imprime siempre igual, y además
// esto la deja a salvo de la exportación: Word recibe el HTML fuera del documento, donde una
// variable CSS (`var(--bx-…)`) no tendría dónde resolverse y quedaría sin valor.
const R = {
  page: { background: "#fff", color: "#111", fontFamily: "Arial, Helvetica, sans-serif",
    maxWidth: 940, margin: "0 auto", padding: "34px 44px", borderRadius: 4,
    fontSize: TAM.base, lineHeight: 1.45 },
  h1: { fontSize: TAM.medio, fontWeight: 700, borderBottom: "2px solid #111", paddingBottom: 6, margin: "0 0 14px" },
  h2: { fontSize: TAM.base, fontWeight: 700, margin: "24px 0 8px", borderBottom: "1px solid #999", paddingBottom: 3 },
  h3: { fontSize: TAM.base, fontWeight: 700, margin: "15px 0 5px" },
  p: { margin: "5px 0", textAlign: "justify" },
  ul: { margin: "5px 0", paddingLeft: 20, textAlign: "justify" },
  li: { margin: "3px 0" },
  frm: { margin: "7px 0", padding: "6px 10px", background: "#f5f5f5", borderLeft: "3px solid #777",
    fontFamily: "Consolas, 'Courier New', monospace", fontSize: TAM.base, whiteSpace: "pre-wrap" },
  tbl: { width: "100%", borderCollapse: "collapse", margin: "6px 0 2px", fontSize: TAM.base },
  th: { border: "1px solid #777", padding: "3px 6px", background: "#e8e8e8", fontWeight: 700, textAlign: "center" },
  td: { border: "1px solid #999", padding: "3px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums" },
  tdL: { border: "1px solid #999", padding: "3px 6px", textAlign: "left" },
  tdC: { border: "1px solid #999", padding: "3px 6px", textAlign: "center" },
  capT: { fontSize: TAM.base, color: "#444", fontStyle: "italic", margin: "0 0 10px", textAlign: "center" },
  note: { fontSize: TAM.base, color: "#555", margin: "4px 0" },
  toc: { fontSize: TAM.base, lineHeight: 1.7, margin: "4px 0 6px" },
  tocL: { display: "block" },
  tocL2: { display: "block", paddingLeft: 22, color: "#333" },
};

const Th = ({ cols }) => <thead><tr>{cols.map((x, i) => <th key={i} style={R.th}>{x}</th>)}</tr></thead>;
const Par = ({ c: con, s: sim, v, u }) => (
  <tr><td style={R.tdL}>{con}</td><td style={R.tdC}>{sim}</td><td style={R.td}>{v}</td><td style={R.tdC}>{u}</td></tr>
);

// Encabezado de esfuerzos, con la unidad debajo del símbolo. Es el mismo en las siete tablas
// que lo usan: armarlo una vez es lo que garantiza que las columnas coincidan entre la tabla
// de hipótesis y la de combinaciones, que es lo que permite compararlas de un vistazo.
const COLS_ESF = COMPONENTES.map(cm => `${cm.rot} [${cm.uni}]`);
const celdasEsf = (esf) => COMP_KEYS.map(k => <td key={k} style={R.td}>{f2(esf?.[k] ?? 0)}</td>);

// ── TABLA NUMERADA, CON SU BOTÓN DE COPIAR ──────────────────────────────────────
//
// El botón va PEGADO al título de la tabla y no en una barra arriba de todo, porque el uso
// real no es «copio la memoria entera»: es «necesito ESTA tabla en el Word que estoy
// escribiendo». Lleva la clase `bx-nocopy`, que `prepararNodo` barre antes de exportar —si
// no, cada tabla llegaría al Word con la palabra «copiar» encima—.
function Tabla({ n, titulo, children }) {
  const ref = useRef(null);
  const toast = useToast();
  const copiar = async () => {
    const r = await copiarNodo(ref.current);
    toast(r.ok ? `Tabla N° ${n} copiada. Pegala en el Word.` : `No se pudo copiar: ${r.motivo}`,
      r.ok ? "ok" : "error", r.ok ? 2600 : 7000);
  };
  return (
    <div ref={ref} style={{ margin: "10px 0 14px" }}>
      <table style={R.tbl}>{children}</table>
      <div style={R.capT}>
        Tabla N° {n} — {titulo}
        <span className="bx-nocopy">
          <button onClick={copiar} title="Copiar esta tabla con formato"
            style={{ marginLeft: 8, background: "transparent", border: "1px solid #bbb",
              borderRadius: 4, color: "#555", cursor: "pointer", fontSize: TAM.base,
              padding: "1px 7px", fontFamily: "inherit", fontStyle: "normal" }}>
            ⧉ copiar
          </button>
        </span>
      </div>
    </div>
  );
}

export function ReporteTab() {
  const { proyecto, nudoAct, nudos, hips, combosU, combosS, porNivel, modo, niveles } = useProyecto();
  const ref = useRef(null);
  const toast = useToast();

  const hoy = new Date().toLocaleDateString("es-AR");
  const cargas = nudoAct?.cargas || {};
  const hipNudo = hips.filter(h => !esPorNivel(h));
  const usaDs = [...combosU, ...combosS].some(x => num(x.f?.[HIP_DS], 0) !== 0);
  const conDs = niveles.filter(nv => !nv.fijo && num(nv.ds, 0) !== 0);

  // Numeración corrida de tablas. Un contador mutable y no un índice calculado: las tablas
  // aparecen dentro de bucles anidados —una por nivel, dos por set— y llevar la cuenta desde
  // afuera es donde se desincroniza el número del cuerpo con el de la referencia.
  let nT = 0;
  const gT = () => ++nT;

  const copiarTodo = async () => {
    const r = await copiarNodo(ref.current);
    toast(r.ok ? "Memoria copiada. Pegala en el Word." : `No se pudo copiar: ${r.motivo}`,
      r.ok ? "ok" : "error", r.ok ? 2600 : 7000);
  };

  return (<>
    <SelectorNudo />

    <Card titulo="Memoria de cálculo"
      desc="Las mismas cifras de Resultados, con el formato de tabla de las memorias de bases y soporte elevado. Cada tabla tiene su propio botón de copiar."
      acciones={<>
        <Boton variante="primario" onClick={copiarTodo}>⧉ Copiar todo</Boton>
        <Boton onClick={() => {
          exportarWord(ref.current, `memoria-${(proyecto || "reacciones").replace(/\s+/g, "_")}-${nudoAct?.nombre || ""}`);
          toast("Descargado el .doc.", "ok");
        }}>⤓ Word</Boton>
      </>}>
      <div style={{ ...t.body, color: c.txt }}>
        <b>Copiar</b> pone la selección en el portapapeles con formato: pegala directo donde
        tengas el cursor en Word y entra como tabla, no como texto. <b>Word</b> baja un
        <code> .doc</code> con la memoria entera, por si preferís abrirla aparte.
        <Ayuda>
          El archivo es HTML con envoltorio de Word, que es el formato que Word abre de forma
          nativa y deja seguir editando con las tablas vivas. No es un <code>.docx</code> real:
          generarlo obligaría a reconstruir el documento con primitivas de una librería,
          duplicando estas líneas y condenándolas a divergir. Acá lo que sale es literalmente lo
          que ves en pantalla.
          <br /><br />
          Si el navegador rechaza el portapapeles —pasa sin HTTPS o con el permiso denegado— se
          usa el camino viejo, que selecciona el nodo y copia. Si aun así falla, bajá el
          <code> .doc</code>.
        </Ayuda>
      </div>
    </Card>

    {/* La memoria se desplaza DENTRO de sí misma y no arrastra a la app: es un documento de
        ancho fijo —tiene que verse como la hoja que va a ser— y eso no se reacomoda en una
        pantalla angosta sin dejar de ser una memoria. */}
    <div style={{ overflowX: "auto", background: "#fff", borderRadius: RAD.lg,
      border: `1px solid ${c.border}` }}>
      <div ref={ref} style={R.page}>

        <div style={R.h1}>MEMORIA DE CARGAS — {proyecto || "Reacciones y combinaciones"}</div>
        <div style={R.toc}>
          <span style={R.tocL}><b>Nudo:</b> {nudoAct?.nombre || "—"} ({nudos.length} en el proyecto)</span>
          <span style={R.tocL}><b>Fecha:</b> {hoy}</span>
          <span style={R.tocL}><b>Criterio de traslado:</b> {MODOS[modo].label}</span>
        </div>

        <div style={R.h2}>1 · OBJETO Y ALCANCE</div>
        <p style={R.p}>
          La presente memoria documenta las <b>reacciones por hipótesis</b> obtenidas del modelo
          de análisis estructural en el nudo <b>{nudoAct?.nombre || "—"}</b>, las
          <b> solicitaciones totales</b> que resultan de combinarlas según los estados límite
          últimos (ELU) y de servicio (ELS) adoptados, y el <b>traslado de esas solicitaciones</b> a
          las cotas de interés por debajo del nudo.
        </p>
        <p style={R.p}>Quedan <b>fuera del alcance</b> de esta memoria, y deben resolverse por separado:</p>
        <ul style={R.ul}>
          <li style={R.li}>la verificación geotécnica de la fundación —tensiones sobre el terreno,
            vuelco, deslizamiento y levantamiento—;</li>
          <li style={R.li}>el dimensionamiento del hormigón armado y de los anclajes;</li>
          <li style={R.li}>el modelo de análisis del que provienen las reacciones, cuyos resultados
            son un <b>dato de partida</b> de esta memoria.</li>
        </ul>

        <div style={R.h2}>2 · CRITERIOS Y CONVENCIONES ADOPTADOS</div>
        <div style={R.h3}>2.1 · Sistema de referencia y componentes</div>
        <p style={R.p}>
          Ejes: <b>X</b> longitudinal, <b>Y</b> transversal, <b>Z</b> vertical positiva hacia
          arriba. El esfuerzo axial <b>N es positivo en compresión</b> sobre el apoyo.
        </p>
        <Tabla n={gT()} titulo="Componentes de esfuerzo y su equivalencia con la salida del modelo">
          <Th cols={["Componente", "Símbolo", "Unidad", "En CYPE", "Descripción"]} />
          <tbody>
            {COMPONENTES.map(cm => (
              <tr key={cm.k}>
                <td style={R.tdL}>{cm.k === "N" ? "Axial vertical"
                  : cm.k === "Vx" ? "Corte longitudinal" : cm.k === "Vy" ? "Corte transversal"
                  : cm.k === "Myy" ? "Momento en el plano X–Z" : cm.k === "Mxx" ? "Momento en el plano Y–Z"
                  : "Momento torsor"}</td>
                <td style={R.tdC}>{cm.rot}</td>
                <td style={R.tdC}>{cm.uni}</td>
                <td style={R.tdC}>{{ N: "Rz", Vx: "Rx", Vy: "Ry", Myy: "My", Mxx: "Mx", T: "Mz" }[cm.k]}</td>
                <td style={R.tdL}>{cm.tip}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>
        <p style={R.note}>
          La correspondencia traduce el <b>nombre</b> de la componente, no su signo. Si el modelo
          entrega la reacción vertical positiva hacia arriba, debe invertirse el signo de N antes
          de aplicar las combinaciones de esta memoria.
        </p>

        <div style={R.h3}>2.2 · Traslado de solicitaciones en profundidad</div>
        <p style={R.p}>
          El traslado de los esfuerzos desde el nudo a una cota situada <b>h</b> metros por debajo
          no modifica las fuerzas y sí los momentos, por el brazo con que actúan los cortes:
        </p>
        <div style={R.frm}>
          N′ = N          Vx′ = Vx          Vy′ = Vy{"\n"}
          Myy′ = Myy + Vx · h          Mxx′ = Mxx + Vy · h          T′ = T
        </div>
        <p style={R.p}>
          El <b>momento torsor no se modifica</b>: el brazo del traslado es paralelo a su eje, de
          modo que las fuerzas horizontales generan momento de vuelco y no de torsión. La suma se
          efectúa <b>componente a componente y con signo</b>
          {modo === "envolvente" && ", salvo en el criterio de envolvente adoptado, en el que se suman las magnitudes"}
          , lo que supone que momentos y cortes provienen del mismo análisis y son coherentes
          entre sí.
          {modo === "envolvente" && <> Se adoptó el criterio de <b>envolvente conservadora</b>{" "}
            (<code>|M| + |V|·h</code>), que constituye una cota superior y no el valor exacto en la cota.</>}
        </p>

        {usaDs && (<>
          <div style={R.h3}>2.3 · Peso propio de la fundación (Ds)</div>
          <p style={R.p}>
            El modelo de análisis finaliza en el nudo, que corresponde a la cara superior de la
            fundación, de modo que <b>no incluye el peso propio de la misma</b>. La hipótesis
            <b> Ds</b> —zapata, pedestal y suelo que gravita sobre ella— se incorpora en cada
            cota con el valor acumulado entre el nudo y esa cota, y participa de las
            combinaciones <b>con su propio coeficiente</b>, minorado a 0,90 (ELU) y 0,60 (ELS) en
            las combinaciones que gobiernan el levantamiento.
          </p>
          <p style={R.note}>
            Se adopta que la resultante de Ds pasa por el punto de medición de los esfuerzos, por
            lo que <b>no genera momento adicional</b>. Esta hipótesis es válida para fundación
            simétrica respecto del pedestal. No se considera subpresión.
          </p>
        </>)}

        <div style={R.h2}>3 · REACCIONES POR HIPÓTESIS EN EL NUDO</div>
        <p style={R.p}>
          Los valores de la Tabla N° {nT + 1} son los entregados por el modelo en el nudo
          <b> {nudoAct?.nombre || "—"}</b>, sin mayorar y sin trasladar.
        </p>
        <Tabla n={gT()} titulo={`Reacciones por hipótesis en el nudo ${nudoAct?.nombre || ""}`}>
          <Th cols={["Hipótesis", ...COLS_ESF]} />
          <tbody>
            {hipNudo.map(h => (
              <tr key={h}>
                <td style={R.tdL}>{h}{!cargas[h] && " (sin datos)"}</td>
                {celdasEsf(cargas[h])}
              </tr>
            ))}
          </tbody>
        </Tabla>

        <div style={R.h2}>4 · DEFINICIÓN DE LAS HIPÓTESIS DE CARGA</div>
        <Tabla n={gT()} titulo="Hipótesis de carga consideradas">
          <Th cols={["Símbolo", "Denominación", "Carácter", "Origen"]} />
          <tbody>
            {hips.map(h => (
              <tr key={h}>
                <td style={R.tdC}><b>{h}</b></td>
                <td style={R.tdL}>{rotuloHip(h)}</td>
                <td style={R.tdC}>{{ permanente: "Permanente", variable: "Variable",
                  accidental: "Accidental", otra: "Del modelo" }[familiaHip(h)]}</td>
                <td style={R.tdL}>{esPorNivel(h)
                  ? "Determinado por cota — no proviene del modelo"
                  : CAT_POR_K[h] ? "Modelo de análisis" : "Hipótesis propia del modelo"}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>

        <div style={R.h2}>5 · COMBINACIONES DE CARGA</div>
        <p style={R.p}>
          Los coeficientes se aplican <b>con signo</b>. El sentido desfavorable de las acciones
          alternantes queda cubierto por la evaluación de la totalidad de las combinaciones y la
          adopción de la envolvente: el viento se considera en sus cuatro sentidos como casos
          independientes y el sismo en una dirección por combinación.
        </p>
        {/* ⚠ TRES COLUMNAS, NO UNA MATRIZ DE COEFICIENTES.
            Es la misma disposición que usa la memoria de `bases-v-0.1`
            (Nomenclatura · Combinación específica · Descripción), y la razón es de papel:
            una matriz con una columna φ por hipótesis son diecinueve columnas, y en una A4
            vertical la última —la que dice qué acciones intervienen— queda con ochenta
            píxeles y parte cada palabra en un renglón. Se probó y era ilegible. La expresión
            escrita lleva exactamente la misma información en una columna ancha. */}
        {[["5.1", "Combinaciones últimas (ELU)", combosU, "ELU",
           "Se emplean para el dimensionamiento estructural de la fundación."],
          ["5.2", "Combinaciones en servicio (ELS)", combosS, "ELS",
           "Se emplean para las verificaciones geotécnicas y de deformación."]]
          .map(([nS, tit, set, pref, para]) => (
          <div key={pref}>
            <div style={R.h3}>{nS} · {tit}</div>
            <p style={R.p}>{para}</p>
            <Tabla n={gT()} titulo={tit}>
              <Th cols={["Nomenclatura", "Combinación específica", "Descripción"]} />
              <tbody>
                {set.map((x, i) => (
                  <tr key={x.k}>
                    <td style={{ ...R.tdC, fontWeight: 700 }}>{pref} {i + 1}</td>
                    <td style={R.tdL}>{comboDesc(x.f, hips)}</td>
                    <td style={R.tdL}>{comboDescNatural(x.f, hips)}</td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </div>
        ))}

        <div style={R.h2}>6 · SOLICITACIONES TOTALES POR COMBINACIÓN</div>
        {conDs.length > 0 && (
          <>
            <p style={R.p}>El peso propio de fundación adoptado en cada cota es el siguiente:</p>
            <Tabla n={gT()} titulo="Peso propio de la fundación por cota">
              <Th cols={["Nivel", "Profundidad h", "Ds"]} />
              <tbody>
                {conDs.map(nv => (
                  <tr key={nv.id}>
                    <td style={R.tdL}>{nv.nombre || "Nivel"}</td>
                    <td style={R.td}>{f2(num(nv.h, 0))} m</td>
                    <td style={R.td}>{f2(num(nv.ds, 0))} kN</td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </>
        )}

        {porNivel.map((r, iN) => (
          <div key={r.nivel.id}>
            <div style={R.h3}>6.{iN + 1} · {rotuloNivel(r.nivel)}</div>
            <p style={R.p}>
              {r.nivel.fijo
                ? "Solicitaciones en el nudo del modelo, sin trasladar."
                : <>Solicitaciones trasladadas <b>{f2(num(r.nivel.h, 0))} m</b> por debajo del
                  nudo{r.ds ? <>, incluyendo <b>Ds = {f2(r.ds)} kN</b> con su coeficiente por
                    combinación</> : ""}. Los brazos aplicados son{" "}
                  {Object.entries(PAR_TRASLADO)
                    .map(([m, v]) => `${m}′ = ${m} + ${v}·${f2(num(r.nivel.h, 0))}`).join(" y ")}.</>}
            </p>
            {[["Combinaciones últimas (ELU)", r.elu, r.envELU],
              ["Combinaciones en servicio (ELS)", r.els, r.envELS]].map(([tit, filas, env]) => (
              <Tabla key={tit} n={gT()}
                titulo={`${tit} — ${r.nivel.fijo ? "nudo del modelo" : `cota ${f2(num(r.nivel.h, 0))} m`}`}>
                <Th cols={["Comb.", ...COLS_ESF]} />
                <tbody>
                  {filas.map(f => (
                    <tr key={f.k}>
                      <td style={R.tdC}><b>{f.nombre}</b></td>
                      {celdasEsf(f.esf)}
                    </tr>
                  ))}
                  {/* La envolvente cierra la tabla en vez de ir aparte: en una memoria
                      impresa, dos tablas de dos filas cada una debajo de la grande son
                      ruido, y acá no hay ordenamiento interactivo que las mezcle. */}
                  <tr>
                    <td style={{ ...R.tdC, background: "#f0f0f0", fontWeight: 700 }}>Máx.</td>
                    {COMP_KEYS.map(k => (
                      <td key={k} style={{ ...R.td, background: "#f0f0f0", fontWeight: 700 }}>
                        {f2(env[k].max.v)}
                        <div style={{ fontWeight: 400, color: "#555" }}>{env[k].max.en}</div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ ...R.tdC, background: "#f0f0f0", fontWeight: 700 }}>Mín.</td>
                    {COMP_KEYS.map(k => (
                      <td key={k} style={{ ...R.td, background: "#f0f0f0", fontWeight: 700 }}>
                        {f2(env[k].min.v)}
                        <div style={{ fontWeight: 400, color: "#555" }}>{env[k].min.en}</div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </Tabla>
            ))}
          </div>
        ))}

        <div style={R.h2}>7 · SÍNTESIS DE SOLICITACIONES ADOPTADAS</div>
        <p style={R.p}>
          Se resumen a continuación los valores extremos de cada componente en cada cota, con
          indicación de la combinación que los produce. Son los valores a adoptar como dato de
          entrada para la verificación de la fundación.
        </p>
        <Tabla n={gT()} titulo="Envolvente de solicitaciones por cota y estado límite">
          <Th cols={["Nivel", "Estado", "Extremo", ...COLS_ESF]} />
          <tbody>
            {porNivel.flatMap(r => [["ELU", r.envELU], ["ELS", r.envELS]].flatMap(([est, env]) =>
              [["Máximo", "max"], ["Mínimo", "min"]].map(([rot, kk]) => (
                <tr key={`${r.nivel.id}-${est}-${kk}`}>
                  <td style={R.tdL}>{r.nivel.fijo ? "Nudo" : `${r.nivel.nombre || "Nivel"} (${f2(num(r.nivel.h, 0))} m)`}</td>
                  <td style={R.tdC}>{est}</td>
                  <td style={R.tdC}>{rot}</td>
                  {COMP_KEYS.map(k => (
                    <td key={k} style={R.td}>
                      {f2(env[k][kk].v)}
                      <div style={{ fontWeight: 400, color: "#555" }}>{env[k][kk].en}</div>
                    </td>
                  ))}
                </tr>
              ))))}
          </tbody>
        </Tabla>

        <div style={R.h2}>8 · CONCLUSIÓN</div>
        <p style={R.p}>
          Se han determinado las solicitaciones de cálculo en el nudo <b>{nudoAct?.nombre || "—"}</b>{" "}
          para {combosU.length} combinaciones últimas y {combosS.length} de servicio, y se las ha
          trasladado a {porNivel.length - 1 > 0
            ? `${porNivel.length - 1} cota${porNivel.length - 1 > 1 ? "s" : ""} por debajo del nudo`
            : "la cota del propio nudo"}. Los valores de la Tabla N° {nT} constituyen el dato de
          partida para la verificación geotécnica y el dimensionamiento estructural de la
          fundación, que no forman parte del alcance de esta memoria.
        </p>
        <p style={R.note}>
          Los coeficientes de combinación adoptados deben contrastarse contra la edición vigente
          de la normativa aplicable al proyecto antes de la emisión del documento.
        </p>
      </div>
    </div>
  </>);
}
