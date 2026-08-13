# Reacciones CYPE → combinaciones — v0.1

App React + Vite que toma la tabla **«Reacciones en los nudos, por hipótesis»** de CYPE,
arma el resumen de esfuerzos por hipótesis, calcula los **totales de cada combinación**
(ELU y ELS) y los **traslada a las profundidades** que hagan falta, donde los momentos
crecen por el brazo del corte.

**No verifica nada.** Resume, combina y traslada. Los números que salen de acá son la
*entrada* de las verificaciones, que viven en `bases-v-0.1` y `soporte-elevado-v4`.

---

## Entorno de trabajo — leer antes de proponer comandos

- **No hay Node ni npm en la máquina del autor.** No proponer `npm install`, `npm run dev`,
  levantar un server local ni correr la suite localmente: nada de eso es ejecutable ahí.
- **El flujo es: editar código → commit → push a `main`.**
- **Los tests corren en GitHub Actions**, en cada push a `main` y en cada PR
  (`.github/workflows/test.yml`). Es la única forma de que se ejecuten.
- Al no poder verificar en runtime desde la máquina de desarrollo, conviene **leer bien
  imports, firmas y usos existentes antes de editar**, y avisar explícitamente qué quedó
  sin verificar.

## Estructura

| Ruta | Contenido |
|---|---|
| `src/engine/importTabla.js` | intérprete de la planilla de CYPE. Es donde vive el riesgo |
| `src/engine/combinar.js` | suma ponderada, envolvente, las tres tablas |
| `src/engine/traslado.js` | `M + V·h`, criterio de signos, niveles |
| `src/services/leerXlsx.js` | lector de `.xlsx` a mano (ZIP + SpreadsheetML), sin dependencias |
| `src/constants/` | componentes, catálogo de hipótesis, sets de combinación |
| `src/components/tabs/` | una pestaña por etapa (Guía · Importar · Hipótesis · Combinaciones · Niveles · Resultados · Reporte) |
| `src/services/exportWord.js` | copiar al portapapeles con formato y bajar el `.doc` |
| `src/context/ProyectoContext.jsx` | estado global, autoguardado en `localStorage`, export/import JSON |

Portado de `bases-v-0.1`: el sistema de diseño entero (`tokens.js`, `styles.js`, `ui.jsx`,
`DataTable.jsx`, `EstilosGlobales.jsx`), el lector de planillas y el intérprete de la tabla.

---

## Convenciones del dominio

- **Ejes:** X = longitudinal · Y = transversal · Z = vertical, positiva hacia arriba.
- **Seis componentes:** `N Vx Vy Myy Mxx T`. `Myy` lo generan las fuerzas según X; `Mxx`,
  las fuerzas según Y; `T` es el torsor alrededor del eje vertical.
- **`N` es positiva en COMPRESIÓN** sobre el apoyo.
- Mapeo desde CYPE: `Rz→N · Rx→Vx · Ry→Vy · My→Myy · Mx→Mxx · Mz→T`.

---

## Decisiones tomadas — no revertir sin conversarlo

- **EL TORSOR SE IMPORTA Y SE CONSERVA.** En `bases-v-0.1`, `Mz` se leía sólo para no
  descolocar las columnas y después se tiraba, porque una fundación directa no se verifica a
  torsión. Acá la app no verifica nada: descartar una columna que el usuario cargó es perder
  un dato suyo, y el torsor es justo el que hace falta cuando estas reacciones van después a
  un anclaje o a una ménsula.

- **NO SE REPARTE EL «PESO PROPIO» DE CYPE.** En bases se sumaba a `De`/`Do`/`Dt` porque allá
  esas tres son *pesos totales por estado*. Acá `PP` es una hipótesis de pleno derecho y su
  factor lo pone el usuario en cada combinación, igual que en CYPE. Repartirla sola le
  cambiaría los números sin que lo pidiera, y al revés de lo que dice su propio modelo.
  · **Consecuencia:** una combinación que diga sólo `1,2·Do` DEJA AFUERA el peso propio. Por
    eso **todos los sets llevan `PP` con el mismo factor que el peso de estado**, y hay un
    test que lo exige sobre las cuatro normativas × ELU/ELS.

- **LA LISTA DE HIPÓTESIS ES DEL PROYECTO, NO DEL PROGRAMA.** En bases son diecisiete, fijas,
  porque esa app necesita saber qué significa cada una para verificar. Acá un modelo puede
  traer `V(0°)H1`, `SX` o `Q1`, y rechazarlos inutilizaría la app para todo modelo que no sea
  el del ejemplo. El catálogo es un punto de partida; el importador **propone** agregar lo
  que encuentre. Las nuevas van **al final**, para no mover las columnas de la matriz que el
  usuario ya tenga escrita.

- **SE COMBINA PRIMERO Y SE TRASLADA DESPUÉS.** Con el criterio con signo da exactamente lo
  mismo al revés —las dos operaciones son lineales, `Σφᵢ(Mᵢ + Vᵢh) = Σφᵢ Mᵢ + h·Σφᵢ Vᵢ`— y
  **hay un test que lo fija**, porque es la clase de identidad que un refactor rompe sin que
  nada falle. Con el criterio de **envolvente** NO conmutan: trasladar hipótesis por hipótesis
  y después sumar magnitudes suma como desfavorables cosas que en la combinación real se
  cancelan. La envolvente tiene que aplicarse sobre la solicitación REAL.

- **EL TRASLADO SUMA CON SIGNO.** `Myy′ = Myy + Vx·h`, `Mxx′ = Mxx + Vy·h`. Es el mismo
  criterio de `bases-v-0.1` y `soporte-elevado-v4` (`M_NF = M_pb + V·h_tr`), y se mantiene
  igual **porque las tres apps se pasan números entre sí**: si una sumara y la otra restara,
  el mismo modelo daría dos memorias distintas y nadie sabría cuál mirar. Existe además el
  modo **envolvente conservadora** (`|M| + |V|·h`) para cuando los signos no son de fiar.

- **EL TORSOR NO CAMBIA AL TRASLADAR, y no es un olvido.** El brazo `h` es paralelo al eje
  del torsor y el producto vectorial de dos vectores paralelos es cero. Habría torsión si el
  punto se corriera *en planta* —una excentricidad—, que es otro traslado y no el que hace
  esta app.

- **CON TABULACIONES, LAS CELDAS VACÍAS SE CONSERVAN** (`matrizDesdeTexto`). El original de
  bases las descartaba siempre, y eso rompía el bloque **transpuesto**: la celda de esquina
  vacía desaparecía, la primera fila quedaba con una celda menos y el transpuesto corría todo
  una columna —la fila de `Do` salía con los valores de `De`, tabla completa y números de la
  hipótesis equivocada—. La tabulación es un separador exacto, así que una celda vacía entre
  dos tabs es un dato posicional. Con espacios se siguen descartando: ahí pueden ser
  alineación. Efecto lateral bienvenido: la fila con «Referencia» combinada vuelve a tener el
  ancho del encabezado.

- **UNA CELDA ES UN VALOR SÓLO SI ES ENTERAMENTE UN NÚMERO** (`RE_SOLO_NUM` en
  `etiquetaDe`). El primer intento preguntaba «¿tiene algún número adentro?», y eso rechazaba
  justo los nombres que genera CYPE: `V(90°)H1` trae el 90 y el 1, se tomaba por un valor y
  la hipótesis se perdía. Toda la función de proponer hipótesis nuevas quedaba inutilizada
  para los nombres reales. `numLat` tampoco sirve ahí: le saca los caracteres no numéricos y
  devuelve 901.

- **EL CSV SALE PARA EXCEL EN ESPAÑOL:** separador `;`, coma decimal y BOM UTF-8. Con punto
  decimal, Excel abre todos los valores como texto —o como fechas— y hay que rehacerlo a
  mano. El encabezado del archivo lleva **nudo, nivel, profundidad y criterio de signos**:
  un momento trasladado sin esos cuatro datos al lado no se puede revisar después.

- **NO HAY PROYECTO DE EJEMPLO CON NÚMEROS CARGADOS.** En bases, el ejemplo dejó cargas viejas
  mezcladas con las importadas más de una vez —la planilla no traía todas las hipótesis y las
  que faltaban conservaban los valores del ejemplo—, y eso no falla: da un resultado plausible
  y equivocado. Por el mismo motivo, «Reemplazar los nudos» viene tildado por defecto.

- **`Ds` ES UNA PROPIEDAD DEL NIVEL, NO DEL NUDO.** El peso propio de la fundación no sale de
  la planilla y nunca va a salir: el modelo de CYPE termina en el nudo, que es la cara
  superior de la fundación. A 0,00 m no hay nada de fundación arriba y a 1,50 m hay todo lo
  que haya entre las dos cotas, así que su valor vive en el nivel (`nv.ds`, en kN) y se
  inyecta como una carga más de ese nivel (`cargasEnNivel`).
  · **Entra en la combinación con SU coeficiente**, no como una suma al final. Sumarlo después
    daría el mismo número sólo cuando el factor vale 1, y en ELU nunca vale 1. En las
    combinaciones de levantamiento va minorado (0,9 / 0,6), que es donde minorar es lo
    conservador; hay un test que lo exige.
  · **Es fuerza vertical pura y positiva:** `N` es positiva en compresión y el peso comprime.
    No genera momento, lo que supone resultante centrada —correcto para zapata simétrica bajo
    el pedestal, no para una fundación excéntrica—. No contempla subpresión.
  · Como no tiene corte, **trasladarlo es una operación nula**, y por eso puede entrar antes
    del traslado sin ningún caso especial. Hay un test que lo fija: si algún día `Ds` llevara
    corte, ese test avisa que el traslado deja de ser inocuo.
  · `Ds` **queda fuera del aviso genérico** de «hipótesis con factor pero sin cargas»: en el
    nudo vale cero por definición. El aviso que sí existe es el contrario (`sinDs`): un nivel
    en profundidad cuyas combinaciones usan `Ds` y que no lo tiene cargado.
  · En la matriz de combinaciones, **`Ds` viaja pegado a `PP`** y se deriva con `conDs()` en
    vez de escribirse en las ochenta filas. Dos números que tienen que ser iguales repetidos
    ochenta veces terminan distintos, y un `Ds` mal factorizado da un total plausible.

- **LA MEMORIA USA TRES COLUMNAS PARA LAS COMBINACIONES, NO UNA MATRIZ DE φ.**
  `Nomenclatura · Combinación específica · Descripción`, igual que `bases-v-0.1`. Se probó la
  matriz con una columna por hipótesis: son diecinueve columnas, y en una A4 vertical la
  última queda con ochenta píxeles y parte cada palabra en un renglón. Medido: la memoria
  pasaba de 8.400 a 17.300 px de alto. La expresión escrita lleva la misma información.

- **`comboDescNatural` USA EL NOMBRE CORTO DEL CATÁLOGO** (campo `corto`), no el rótulo largo.
  Con el largo, una fila corriente se describía como «Peso propio de la fundación + Peso
  propio (del modelo) + Peso en operación + Sobrecarga de uso + Nieve + viento». Los cuatro
  vientos colapsan en «viento» y los cuatro sismos en «sismo». Hay test.

- **LO QUE SE COPIA ES EL DOM VIVO, no una segunda representación en HTML de cadena.** Copiar
  y bajar el `.doc` leen el nodo que está en pantalla, así que lo que se pega es literalmente
  lo que se ve. Dos versiones —una para mirar y otra para exportar— divergen, y nadie lo nota
  hasta que el número está en un plano.
  · Los botones «copiar» viven DENTRO de la memoria, al lado de cada epígrafe, porque el uso
    real es «necesito ESTA tabla», no «copio todo». Llevan la clase `bx-nocopy`, que
    `prepararNodo` barre antes de exportar: sin eso, cada tabla llegaría al Word con la
    palabra «copiar» encima. Hay verificación en navegador de que el HTML copiado trae una
    sola `<table>` y ningún `<button>`.
  · Se escribe `text/html` **y** `text/plain` en el mismo evento, con un camino de respaldo por
    `execCommand` para navegadores sin `ClipboardItem` o con el permiso denegado.

## Trampas conocidas del código

- **Los campos de formulario son STRINGS**, no números: vienen de `<input type="number">`.
  `f2`/`f3` sólo formatean si `typeof === "number"`. La conversión se hace en `setCarga` del
  contexto y no en cada pantalla.
- **Quitar una hipótesis tiene que limpiar también su factor** en todas las combinaciones
  (`quitarHip`). Sin eso, la columna desaparece de la pantalla pero la hipótesis sigue sumando
  al total: la peor forma de equivocarse, porque es invisible. Hay test.
- **`numLat` y `numerosDe` reconocen la notación científica ENTERA.** Excel guarda todo valor
  chico así (`1.7999999999999999E-2`); sin eso, la componente desaparecía o —peor— la celda
  daba dos números y descolocaba la fila.
- **`Object.keys` sobre los factores no da un orden estable de columnas.** Las columnas salen
  siempre de la lista viva `hips`.

## Pendientes conocidos

- **No agrega peso al bajar de nivel.** El traslado cambia los momentos por el brazo del
  corte y nada más; el peso del pedestal, de la zapata y del suelo lo calcula la app que
  dimensiona, a partir de su geometría. Sumarlo en los dos lados sería contarlo dos veces.
- **No hay traslado en planta.** Una excentricidad `e_x`/`e_y` generaría torsión y momentos
  por `N·e`; hoy no está.
- La **memoria de cálculo en Word** no existe: la salida es CSV.
- Sólo se lee `.xlsx` y `.csv`. El `.xls` viejo no.

## Estilo

- **Español**, tanto en el código como en los textos de la app.
- Los comentarios explican **por qué**, no qué hace la línea.
- Mensajes de commit descriptivos: qué cambió, qué decisión se tomó y qué se rompería si se
  revierte.
