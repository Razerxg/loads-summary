// TABLA DE DATOS con encabezado fijo, orden, búsqueda y columnas ocultables.
//
// Está pensada para las tablas LARGAS de resultados —el detalle por combinación son 16
// filas × 18 columnas, la matriz del what-if más— donde el problema no es leer un dato
// sino ENCONTRARLO. Las tablas cortas de trazabilidad (`ProcTable`) no la usan: ahí
// ordenar no significa nada, porque el orden ES el del cálculo.
//
// No transforma los datos: recibe filas ya formateadas por el llamador, que es quien
// sabe cuántos decimales lleva cada magnitud. Ordenar usa el valor crudo (`v`) y no el
// texto, para que 9 no quede después de 10.
import { useState, useMemo, useId } from 'react';
import { c, t, SP, R, TRANS, MONO, TAM } from './tokens.js';
import { Tip, Boton } from './ui.jsx';
import { s } from './styles.js';

// Una columna: { k, titulo, tip, num, ancho, oculta }
//   k      identificador
//   num    alinea a la derecha y en mono, y ordena numéricamente
//   tip    explicación en el encabezado
//
// Una celda de fila se declara { v, txt, color, peso } o simplemente un valor:
//   v      valor crudo, el que se ordena
//   txt    lo que se muestra (si falta, se muestra `v`)

export const celda = (x) => (x !== null && typeof x === "object" && !Array.isArray(x))
  ? x : { v: x, txt: x };

// COMPARADOR. Exportado para poder fijarlo con un test: la regla de los no finitos es
// justo la que se rompe sola al refactorizar.
//
// Los valores no finitos —el ∞ de un FS sin solicitación, el "—" de una combinación con
// levantamiento— van SIEMPRE al final, ordene ascendente o descendente. Arriba de la
// lista no dicen nada y tapan el caso que se está buscando.
export function comparador(num, asc) {
  const sig = asc ? 1 : -1;
  return (va, vb) => {
    if (num) {
      const fa = Number(va), fb = Number(vb);
      const oka = Number.isFinite(fa), okb = Number.isFinite(fb);
      if (!oka && !okb) return 0;
      if (!oka) return 1;
      if (!okb) return -1;
      return (fa - fb) * sig;
    }
    return String(va ?? "").localeCompare(String(vb ?? ""), "es") * sig;
  };
}

export function DataTable({
  cols, filas, buscar = true, ocultables = true, maxAlto = 460,
  onFila = null, filaActiva = null, vacio = "Sin datos", pie = null,
}) {
  const [orden, setOrden] = useState(null);        // { k, asc }
  const [q, setQ] = useState("");
  const [ocultas, setOcultas] = useState(() => new Set(cols.filter(x => x.oculta).map(x => x.k)));
  const [menu, setMenu] = useState(false);
  const id = useId();

  const visibles = cols.filter(x => !ocultas.has(x.k));

  const datos = useMemo(() => {
    let out = filas;
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      // Se busca sobre el TEXTO mostrado, que es lo que el usuario tiene delante.
      out = out.filter(f => visibles.some(col => {
        const cl = celda(f.celdas[col.k]);
        return String(cl.txt ?? cl.v ?? "").toLowerCase().includes(needle);
      }));
    }
    if (orden) {
      const col = cols.find(x => x.k === orden.k);
      const cmp = comparador(!!col?.num, orden.asc);
      out = [...out].sort((a, b) =>
        cmp(celda(a.celdas[orden.k]).v, celda(b.celdas[orden.k]).v));
    }
    return out;
  }, [filas, q, orden, cols, visibles]);

  const alternar = (k) => setOrden(o =>
    o?.k !== k ? { k, asc: true } : o.asc ? { k, asc: false } : null);

  return (
    <div style={{ minWidth: 0 }}>
      {(buscar || ocultables) && (
        <div style={{ display: "flex", gap: SP.sm, alignItems: "center", marginBottom: SP.sm,
          flexWrap: "wrap" }}>
          {buscar && (
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar…"
              aria-label="Buscar en la tabla"
              style={{ ...s.inp, width: 200, fontFamily: "inherit" }} />
          )}
          <span style={{ ...t.micro }}>
            {datos.length === filas.length ? `${filas.length} filas` : `${datos.length} de ${filas.length} filas`}
          </span>
          <div style={{ flex: 1 }} />
          {orden && <Boton variante="fantasma" onClick={() => setOrden(null)}>orden original</Boton>}
          {ocultables && (
            <div style={{ position: "relative" }}>
              <Boton onClick={() => setMenu(m => !m)}
                title="Elegir qué columnas se muestran">Columnas ({visibles.length}/{cols.length})</Boton>
              {menu && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 50,
                  background: c.overlay, border: `1px solid ${c.border}`, borderRadius: R.md,
                  padding: SP.sm, boxShadow: "0 8px 24px rgba(0,0,0,.5)", maxHeight: 320,
                  overflowY: "auto", minWidth: 180 }}>
                  {cols.map(col => (
                    <label key={col.k} style={{ display: "flex", alignItems: "center", gap: SP.sm,
                      padding: "4px 6px", borderRadius: R.sm, cursor: "pointer", ...t.body,
                      fontSize: TAM.base, color: c.txt, whiteSpace: "nowrap" }}>
                      <input type="checkbox" checked={!ocultas.has(col.k)}
                        onChange={() => setOcultas(v => {
                          const n = new Set(v);
                          // Nunca dejar la tabla sin columnas: sin esto se podía
                          // esconder la última y quedaba un rectángulo vacío.
                          if (n.has(col.k)) n.delete(col.k);
                          else if (visibles.length > 1) n.add(col.k);
                          return n;
                        })} />
                      {col.titulo}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ overflow: "auto", maxHeight: maxAlto, border: `1px solid ${c.border}`,
        borderRadius: R.md }}>
        <table className="bx-tabla" style={{ ...s.table, marginBottom: 0 }}>
          <thead>
            <tr>
              {visibles.map(col => {
                const act = orden?.k === col.k;
                return (
                  <th key={col.k} onClick={() => alternar(col.k)} scope="col"
                    aria-sort={act ? (orden.asc ? "ascending" : "descending") : "none"}
                    style={{ ...s.th, cursor: "pointer", userSelect: "none",
                      textAlign: col.num ? "right" : "left",
                      color: act ? c.txt : undefined, transition: `color ${TRANS}`,
                      width: col.ancho }}>
                    <Tip texto={col.tip}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {col.titulo}
                        {/* La flecha ocupa lugar SIEMPRE (transparente cuando no
                            ordena) para que los encabezados no salten al ordenar. */}
                        <span aria-hidden style={{ fontSize: TAM.base, opacity: act ? 1 : 0 }}>
                          {act && !orden.asc ? "▼" : "▲"}
                        </span>
                      </span>
                    </Tip>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {datos.length === 0 && (
              <tr><td colSpan={visibles.length} style={{ ...s.tdL, textAlign: "center",
                color: c.txt3, padding: SP.lg }}>{vacio}</td></tr>
            )}
            {datos.map(f => (
              <tr key={f.k} onClick={onFila ? () => onFila(f.k) : undefined}
                style={{ cursor: onFila ? "pointer" : undefined,
                  background: filaActiva === f.k ? c.azulBg : undefined }}>
                {visibles.map(col => {
                  const cl = celda(f.celdas[col.k]);
                  return (
                    <td key={col.k} style={{
                      ...(col.num ? s.td : s.tdL),
                      color: cl.color, fontWeight: cl.peso,
                      whiteSpace: col.num ? "nowrap" : undefined,
                    }}>{cl.txt ?? cl.v}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pie && <div style={s.note}>{pie}</div>}
    </div>
  );
}
