function interp(tab, x) {
  if (x <= tab[0][0]) return tab[0][1];
  if (x >= tab[tab.length-1][0]) return tab[tab.length-1][1];
  for (let i = 0; i < tab.length-1; i++)
    if (x >= tab[i][0] && x <= tab[i+1][0])
      return tab[i][1] + (tab[i+1][1]-tab[i][1])*(x-tab[i][0])/(tab[i+1][0]-tab[i][0]);
  return tab[0][1];
}
const num = (v, d=1) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
const opt = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };
// Formateadores. Sólo formatean NÚMEROS: los campos de formulario son strings, así que
// hay que pasarlos por `num()` antes o se imprime "—". Es un error que ya apareció.
const f0 = v => (typeof v === "number" && isFinite(v)) ? v.toFixed(0) : "—";
const f1 = v => (typeof v === "number" && isFinite(v)) ? v.toFixed(1) : "—";
const f2 = v => (typeof v === "number" && isFinite(v)) ? v.toFixed(2) : "—";
const f3 = v => (typeof v === "number" && isFinite(v)) ? v.toFixed(3) : "—";

export { interp, num, opt, f0, f1, f2, f3 };
