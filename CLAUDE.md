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

- **HAY DOS MODOS Y SON OPUESTOS: «un nudo» y «conjunto».** No es una preferencia de
  visualización, es de qué situación física se está hablando.
  · **UN NUDO, UNA FUNDACIÓN** — veinte soportes con veinte bases independientes. Cada nudo se
    mira por separado y sumarlos no significaría nada. Es el modo por defecto, porque es el
    que no exige ninguna decisión previa.
  · **VARIOS NUDOS, UNA FUNDACIÓN** (`conjunto: true`) — un sleeper, una platea corrida, el
    skid en sus cuatro apoyos. Esa fundación recibe todas las reacciones a la vez y lo que hay
    que equilibrar para la estabilidad global es la RESULTANTE.
  · Los nudos incluidos se eligen con casillas: una planilla trae TODOS los del modelo y esta
    fundación recibe unos pocos. Sumarlos todos por defecto metería apoyos de otra base.

- **EL CONJUNTO SUMA COMPONENTE A COMPONENTE, SIN POSICIONES** (`engine/conjunto.js`). Eso
  equivale a suponer que **todas las resultantes actúan en el baricentro de la fundación**, que
  es el criterio adoptado y está declarado en el capítulo 3.1 de la memoria.
  · **Consecuencia a no olvidar:** desaparecen los términos `N·e` de la excentricidad de cada
    apoyo, y con ellos la necesidad de conocer la posición en planta de los nudos —que la tabla
    de reacciones de CYPE no trae—. Para un conjunto razonablemente simétrico es el criterio
    corriente; para uno con las verticales netamente descentradas, subestima el vuelco.
  · **SE SUMA POR HIPÓTESIS, NO POR COMBINACIÓN.** Primero los veinte `Wx+`, después se
    combina. Al revés mezclaría casos que no ocurren a la vez. Da lo mismo mientras la
    combinación sea lineal, y hay un test que lo fija: si algún día apareciera un criterio no
    lineal, ese test avisa que el orden deja de ser indistinto.
  · **`Ds` sigue siendo uno solo**, del nivel: es el peso de la platea que recibe los apoyos,
    no uno por nudo. Hay test.
  · ⚠ **El aviso de hipótesis incompleta no es opcional.** Si tres de veinte nudos no traen
    `Wx+`, el viento del conjunto sale un 15 % bajo; el número es plausible, no rompe nada, y
    una suma de diecisiete valores no se revisa a ojo. Por eso `sumarNudos` devuelve `detalle`
    con qué nudos aportaron a cada hipótesis y emite el aviso.

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

- **AGREGAR UNA HIPÓTESIS AL CATÁLOGO NO ALCANZA: HAY QUE MIGRAR** (`engine/migrar.js`).
  Los proyectos viven en `localStorage` y en `.reacciones.json`, y al abrirlos se respetan sus
  matrices —son del usuario—. Cuando el programa agregó `Ds`, todo proyecto anterior quedó sin
  la columna `φDs`: el usuario cargaba el peso de la platea en Niveles, veía el campo lleno, y
  **el número se multiplicaba por cero sin ningún error**. Pasó de verdad y lo reportó el
  usuario. Hay test del modo de falla completo.
  · Se agrega la hipótesis a la lista —en el ORDEN DEL CATÁLOGO y no al final, porque los
    factores se guardan por nombre y el orden es puramente visual— y se copia el coeficiente
    de `PP`, que es la regla con la que se arman los sets (`conDs`).
  · **Si la combinación no tiene `PP`, no se inventa nada**: sin permanente de referencia,
    poner 1,0 sería elegir por el usuario un número que cambia el resultado. Se listan aparte.
  · **Se informa siempre** (`AvisoMigracion`), con tarjeta persistente y no con un toast: esto
    modifica la matriz del usuario, y una migración muda es un cambio de números sin autor.
  · Es idempotente, y un proyecto al día devuelve `cambios: null` para que no se muestre nada.

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
- ~~No hay traslado en planta~~ → **ya está** (`engine/planta.js`): cada nudo puede llevar su
  posición `pos.x`, `pos.y` con signo, medida desde el eje de la fundación. Falta el caso de un
  nudo suelto descentrado fuera del modo conjunto, que hoy no usa la posición.
- La salida en Word es un **volcado de las tablas con formato de memoria** (`ReporteTab` +
  `services/exportWord.js`), no una memoria de cálculo con capítulos y fundamentación como la de
  `soporte-elevado-v4` o `bases-v-0.1`. Alcanza para pegar en un documento; no se sostiene sola.
- Sólo se lee `.xlsx` y `.csv`. El `.xls` viejo no.

## El traslado en planta, y por qué existe

- ⚠ **UNA ESTRUCTURA CON BASES ARTICULADAS NO ENTREGA SU VUELCO COMO MOMENTO.** Es el caso que
  obligó a agregar `engine/planta.js`. Una plataforma con columnas arriostradas por cruces de
  San Andrés, con una carga horizontal arriba: cada nudo entrega momento CERO por definición, y
  el vuelco viaja como **par de fuerzas verticales** —dos apoyos que se comprimen, dos que se
  descargan—. Sumando sin posiciones, los ΔN se cancelan, todos los momentos son cero y el
  conjunto informa **vuelco nulo**. Medido en el caso de los tests: 0 contra 300 kN·m.
  · No era una subestimación menor de la hipótesis del baricentro: era perderlo entero.
- **La posición es GEOMÉTRICA Y POR NUDO, no una excentricidad global.** Se probó pensar en un
  único `e_x`, `e_y` para todo el conjunto y **no sirve**: la excentricidad de la resultante no
  es un dato geométrico sino que depende de la hipótesis —vale `H·z/W` con viento y **cero** con
  peso propio, y cambia de signo entre `Wx+` y `Wx−`—. Con posiciones por nudo eso sale solo:
  los `N·x` se cancelan en gravedad y aparecen con su signo en viento. Hay test de las dos cosas.
- **La fórmula, igual que `bases-v-0.1`** (`engine/loads.js`): `Myy += N·x`, `Mxx += N·y`. Las
  apps se pasan números; una diferencia de criterio acá daría dos memorias del mismo modelo.
- **Acá SÍ aparece torsión**, al revés que en el traslado en profundidad: `T += Vy·x − Vx·y`,
  que es `(r × F)_z`. El encabezado de `traslado.js` explica por qué bajar por el eje vertical
  no la genera —el brazo es paralelo al eje del torsor— y anticipaba justamente este otro caso.
- **Se aplica antes de acumular y por hipótesis**, así que es lineal y conmuta con el traslado
  en profundidad y con la combinación: `M = M₀ + N·x + V·h` sale igual en cualquier orden.
- **El `Ds` no lleva posición y no debe llevarla:** es el peso propio de la fundación, actúa en
  su propio eje. Entra como hipótesis del nivel (`cargasEnNivel`), después de la suma de nudos,
  así que queda fuera por construcción.
- ⚠ **Riesgo de doble conteo con `bases-v-0.1`.** Esa app modela las cargas como puntos con
  posición y hace `N·x` por su cuenta. La excentricidad se declara en UN solo lado: acá si el
  destino recibe la resultante centrada, allá si se le pasan los puntos con sus coordenadas.
- **Es el modelo correcto para estabilidad global** —vuelco, deslizamiento, presiones— y no para
  diseño local: para punzonado o flexión de la losa importa dónde está cada apoyo, no la
  resultante.

## Estilo

- **Español**, tanto en el código como en los textos de la app.
- Los comentarios explican **por qué**, no qué hace la línea.
- Mensajes de commit descriptivos: qué cambió, qué decisión se tomó y qué se rompería si se
  revierte.
