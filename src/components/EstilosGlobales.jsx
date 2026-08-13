// ESTILOS GLOBALES.
//
// La app se estiliza con `style={{}}` inline, que es simple y no necesita build de CSS,
// pero tiene un límite duro: no expresa :hover, :focus-visible ni @keyframes. Todo eso
// vive acá, en una única hoja inyectada una sola vez, enganchada por clases `bx-*`.
//
// Es deliberadamente corto. Si una regla se puede escribir inline, va inline; acá sólo
// entra lo que inline es IMPOSIBLE.
import { c, R, TRANS, SOMBRA, MONO, FUENTE, TAM, cssTemas } from './tokens.js';

const CSS = `
/* LOS VALORES DE COLOR, PRIMEROS. Todo lo demás —y todos los estilos en línea de la
   app— usa var(--bx-*), así que estas dos declaraciones son la única diferencia entre
   el tema oscuro y el claro. Cambiar de tema es cambiar el atributo data-tema del
   elemento raíz: no re-renderiza nada y no hay estado de color en React.
   (Ojo: este bloque vive dentro de un template literal, así que no lleva acentos
   graves ni la secuencia de interpolación.) */
${cssTemas()}

*,*::before,*::after{box-sizing:border-box}

/* LA FAMILIA SE FIJA ACÁ, EN EL BODY, y no en el div raíz de React.
   Motivo: el shell nuevo dejó de usar \`s.root\` y su div raíz no declaraba
   \`fontFamily\`, así que TODO el texto que no lo pedía explícitamente se renderizaba
   con el tipo por defecto del navegador —Times New Roman, con serifas— mezclado con
   los pocos lugares que sí pedían una familia. Eso es lo que se veía como "varias
   fuentes distintas". En el body no depende de qué componente monte la raíz.
   Los SVG no heredan de forma fiable, así que además llevan la familia por atributo. */
body{margin:0;background:${c.canvas};font-family:${FUENTE};font-size:${TAM.base}px;
  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
svg text{font-family:${FUENTE}}

/* La barra de scroll por defecto de Chrome en fondo oscuro es un tajo blanco. */
*::-webkit-scrollbar{width:10px;height:10px}
*::-webkit-scrollbar-track{background:transparent}
*::-webkit-scrollbar-thumb{background:${c.borderFuerte};border-radius:${R.full}px;border:3px solid ${c.canvas}}
*::-webkit-scrollbar-thumb:hover{background:${c.txt3}}

/* FOCO VISIBLE en todo lo interactivo. Antes no se veía dónde estaba el cursor de
   teclado, que en un formulario de treinta campos es la diferencia entre poder
   tabular y no poder. Sólo :focus-visible, para no dibujar el anillo al hacer clic. */
:focus-visible{outline:none;box-shadow:${SOMBRA.foco};border-color:${c.azul}!important}

input,select,textarea,button{font-family:inherit}
input[type=number]{-moz-appearance:textfield}
input[type=number]::-webkit-outer-spin-button,
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}

.bx-in:hover:not(:focus){border-color:${c.txt3}}
.bx-btn:hover{filter:brightness(1.12)}
.bx-btn:active{transform:translateY(1px)}
.bx-btn2:hover{background:${c.hover};border-color:${c.borderFuerte}}
.bx-btnR:hover{background:${c.rojoBg}}
.bx-nav:hover{background:${c.hover};color:${c.txt}}
.bx-fila:hover{background:${c.hover}80}
.bx-card{transition:border-color ${TRANS}}
.bx-clic{cursor:pointer;transition:border-color ${TRANS},background ${TRANS}}
.bx-clic:hover{border-color:${c.borderFuerte};background:${c.hover}}

/* ZEBRA en las tablas largas: sin ella el ojo salta de fila al recorrer una columna. */
.bx-tabla tbody tr:nth-child(even){background:${c.surface}66}
.bx-tabla tbody tr:hover{background:${c.hover}}
/* ENCABEZADO FIJO: la tabla scrollea bajo su propio header, que queda legible. */
.bx-tabla thead th{position:sticky;top:0;z-index:2}

/* Acordeones: la flecha nativa de <details> es distinta en cada navegador. */
.bx-acc>summary{list-style:none;cursor:pointer}
.bx-acc>summary::-webkit-details-marker{display:none}
.bx-acc>summary .bx-flecha{transition:transform ${TRANS}}
.bx-acc[open]>summary .bx-flecha{transform:rotate(90deg)}
.bx-acc[open]>.bx-cuerpo{animation:bxAbrir 160ms cubic-bezier(.2,.6,.35,1)}
@keyframes bxAbrir{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}

/* El tooltip ya NO se resuelve por CSS.
   Era un position:absolute dentro del ícono, y por eso lo recortaba cualquier
   contenedor con overflow -tarjetas, grillas, acordeones-, abría siempre hacia arriba
   y no tenía tope de alto. Ahora lo arma ui.jsx (componente Flotante) con portal a
   body, position:fixed, volteo según el lugar disponible y scroll interno si no entra.
   Las reglas viejas se sacan enteras para que no queden dos mecanismos a la vez. */

/* Toast: entra desde abajo, no interrumpe. */
@keyframes bxToast{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.bx-toast{animation:bxToast 180ms cubic-bezier(.2,.6,.35,1)}

/* Skeleton mientras se recalcula algo caro (el barrido del catálogo). */
@keyframes bxBrillo{to{background-position:-200% 0}}
.bx-skel{background:linear-gradient(90deg,${c.raised} 25%,${c.hover} 37%,${c.raised} 63%);
  background-size:200% 100%;animation:bxBrillo 1.3s linear infinite;border-radius:${R.sm}px}

@keyframes bxEntrar{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.bx-entra{animation:bxEntrar 200ms cubic-bezier(.2,.6,.35,1)}

.bx-mono{font-family:${MONO};font-variant-numeric:tabular-nums}

/* NOTEBOOK 1366: por debajo de eso el panel de estado se va abajo en vez de apretar
   el contenido. */
@media (max-width:1180px){.bx-conPanel{grid-template-columns:1fr!important}}

/* ANGOSTO. LA BARRA LATERAL YA NO SE OCULTA ACA: la controla el estado de la interfaz
   (UiContext.nav), y en angosto se dibuja como un cajon superpuesto que abre el boton
   hamburguesa. Ocultarla por CSS dejaba a la app SIN NINGUNA navegacion en un telefono
   -encerrada en la pantalla en la que uno hubiera caido-, que es bastante peor que el
   problema de espacio que la regla venia a resolver.
   Lo que si queda es apretar los margenes: en 412 px, 24 de cada lado son papel tirado. */
@media (max-width:900px){
  .bx-shell{grid-template-columns:1fr!important}
  .bx-main{padding-left:12px!important;padding-right:12px!important}
}

@media print{.bx-sidebar,.bx-noPrint{display:none!important}.bx-shell{grid-template-columns:1fr!important}}
`;

export function EstilosGlobales() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />;
}
