// LAS SEIS COMPONENTES DE UNA REACCIÓN, y el criterio de ejes.
//
// Convención de ejes, la misma que soporte-elevado-v4 y bases:
//   X = longitudinal · Y = transversal · Z = VERTICAL, positiva hacia arriba.
//   N    axial vertical (Rz de CYPE)
//   Vx   corte según X (Rx)      · Vy  corte según Y (Ry)
//   Myy  momento que generan las fuerzas según X, o sea el que "vuelca" en el plano X–Z (My)
//   Mxx  momento que generan las fuerzas según Y  (Mx)
//   T    torsor alrededor del eje vertical (Mz)
//
// EL TORSOR SE CONSERVA, y ésta es la diferencia de alcance con `bases-v-0.1`. Allá `Mz`
// se leía sólo para no descolocar el resto de las columnas y después se tiraba, porque una
// fundación directa no se verifica a torsión. Acá la app NO VERIFICA NADA: su trabajo es
// resumir y combinar lo que entregó el modelo. Descartar una columna que el usuario cargó
// sería perder un dato suyo, y el torsor es justamente el que hace falta cuando estas
// reacciones van después a un anclaje, a una ménsula o a un perfil soporte.
export const COMPONENTES = [
  { k: "N",   rot: "N",   uni: "kN",   tip: "Axial vertical. En CYPE es Rz." },
  { k: "Vx",  rot: "Vx",  uni: "kN",   tip: "Corte según X (longitudinal). En CYPE es Rx." },
  { k: "Vy",  rot: "Vy",  uni: "kN",   tip: "Corte según Y (transversal). En CYPE es Ry." },
  { k: "Myy", rot: "Myy", uni: "kN·m", tip: "Momento en el plano X–Z, el que generan las fuerzas según X. En CYPE es My." },
  { k: "Mxx", rot: "Mxx", uni: "kN·m", tip: "Momento en el plano Y–Z, el que generan las fuerzas según Y. En CYPE es Mx." },
  { k: "T",   rot: "T",   uni: "kN·m", tip: "Torsor alrededor del eje vertical. En CYPE es Mz." },
];

export const COMP_KEYS = COMPONENTES.map(c => c.k);
export const COMP = Object.fromEntries(COMPONENTES.map(c => [c.k, c]));

// Las FUERZAS y los MOMENTOS se separan porque el traslado en profundidad los trata
// distinto: las fuerzas viajan iguales y los momentos crecen. Tenerlo declarado acá evita
// que cada consumidor arme su propia lista y que una quede desactualizada.
export const FUERZAS = ["N", "Vx", "Vy"];
export const MOMENTOS = ["Myy", "Mxx", "T"];

// Qué corte alimenta a qué momento al bajar de nivel. El torsor NO tiene par: una fuerza
// horizontal aplicada sobre el eje vertical no genera torsión por trasladarse a lo largo
// de ese mismo eje, así que `T` viaja sin cambio. Es la razón de que este mapa tenga dos
// entradas y no tres.
export const PAR_TRASLADO = { Myy: "Vx", Mxx: "Vy" };
