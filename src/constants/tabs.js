// Las pantallas, en el orden en que se recorren la primera vez. El orden ES el flujo de
// trabajo: se trae la planilla, se revisa lo que entró, se arma el criterio de combinación,
// se declaran los niveles y recién entonces se miran los totales.
export const TABS = ["Guía", "Importar", "Hipótesis", "Combinaciones", "Niveles", "Resultados", "Reporte"];

// Una línea por pantalla, para la barra lateral. Sin esto, «Niveles» no le dice nada a
// quien abre la app por primera vez.
export const TABS_DESC = {
  "Guía": "Qué hace la app y con qué criterios",
  "Importar": "Traer la planilla de CYPE",
  "Hipótesis": "Resumen de esfuerzos por hipótesis",
  "Combinaciones": "Matrices ELU y ELS",
  "Niveles": "Profundidades a las que trasladar",
  "Resultados": "Totales por combinación y por nivel",
  "Reporte": "Las tablas con formato de memoria",
};
