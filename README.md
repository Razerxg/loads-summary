# Reacciones CYPE → combinaciones

Volcá la tabla **«Reacciones en los nudos, por hipótesis»** de CYPE y salí con los esfuerzos
totales de cada combinación, en el nudo y a las profundidades que hagan falta.

## Qué hace

1. **Importa la planilla** (`.xlsx` o `.csv`, o el bloque pegado). Reconoce la nomenclatura
   de CYPE (`Rx/Ry/Rz`, `Mx/My/Mz`, `WX±`, «Peso propio»), parte la tabla por nudo aunque la
   columna «Referencia» venga combinada, transpone el bloque si las hipótesis están en el
   encabezado y lee la notación científica de Excel.
2. **Resume por hipótesis** — una fila por hipótesis con las seis componentes
   (`N · Vx · Vy · Myy · Mxx · T`), editable para completar lo que la planilla no traiga.
3. **Combina** — dos matrices, ELU y ELS, con sets patrón y presets de CIRSOC 201,
   ACI 318-19 / ASCE 7-16 y PIP STC01015. Da el total de cada combinación y la **envolvente**
   con el nombre de la combinación que la produce.
4. **Traslada a profundidad** — cada nivel declarado genera su propio juego de tablas con los
   momentos ya llevados a esa cota: `Myy′ = Myy + Vx·h`, `Mxx′ = Mxx + Vy·h`.
5. **Emite la memoria** — pestaña *Reporte*: las mismas cifras con el formato de tabla de las
   memorias de bases y soporte elevado (papel blanco, Arial, «Tabla N° x»). Cada tabla tiene
   su botón de **copiar**, que la deja en el portapapeles con formato para pegarla directo en
   un Word; y hay un `.doc` de la memoria entera.
6. **Exporta a CSV**, un archivo por nivel, con separador `;` y coma decimal para que abra
   directo en Excel en español.

## Los dos modos: un nudo, o el conjunto

Son dos situaciones opuestas, y de cuál sea depende todo lo que muestra la app.

**Un nudo, una fundación** — veinte soportes con veinte bases independientes. Cada nudo se
mira por separado. Es el modo por defecto.

**Varios nudos, una fundación** — un *sleeper*, una platea corrida, el skid en sus cuatro
apoyos. Se tildan los nudos que gravitan sobre esa fundación y las cargas **se suman hipótesis
por hipótesis**: las tablas pasan a ser de la **resultante del conjunto**, que es lo que hay que
equilibrar para la estabilidad global.

> Con la planilla de ejemplo (4 nudos): el `Vx` del peso propio se cancela entre apoyos
> (0,553 − 0,561 + 0,269 − 0,261 ≈ 0), como corresponde a una estructura simétrica, y el del
> viento `Wx+` se acumula a −15,54 kN — la fuerza horizontal total contra el deslizamiento.

**Hipótesis de composición:** se considera que todas las resultantes actúan en el **baricentro
de la fundación**, así que no hace falta la posición en planta de los nudos. La contrapartida es
que el momento del conjunto es la suma de los momentos de los apoyos y **no incluye los términos
`N·e`** de la excentricidad de cada uno: para un conjunto razonablemente simétrico es el
criterio corriente, y para uno con las verticales netamente descentradas subestima el vuelco.

Se suma **por hipótesis y no por combinación**: sumar combinaciones ya armadas mezclaría casos
que no ocurren a la vez. Y si algún nudo no trae alguna hipótesis, la app lo avisa — tres de
veinte sin `Wx+` dan un viento 15 % bajo que parece correcto.

## Ds — el peso propio de la fundación

La planilla de CYPE **nunca lo trae**, y no es un defecto del importador: el modelo termina en
el nudo, que es la cara superior de la fundación. La zapata, el pedestal y el suelo que gravita
encima existen *por debajo* de ese punto.

Por eso `Ds` se carga **por nivel** —a 0,00 m no hay nada de fundación arriba— y **entra en las
combinaciones con su propio coeficiente**, minorado a 0,90 (ELU) y 0,60 (ELS) en las que
gobiernan el levantamiento. No es una suma al final.

Se supone resultante centrada, o sea que `Ds` **no genera momento**: es correcto para zapata
simétrica bajo el pedestal y no lo es para una fundación excéntrica. No contempla subpresión.

## Qué NO hace

No verifica nada: ni tensiones sobre el terreno, ni vuelco, ni deslizamiento, ni armaduras.
Resume, combina y traslada. Los números que salen de acá son la *entrada* de esas
verificaciones.

Tampoco agrega peso al bajar de nivel: el peso del pedestal, de la zapata y del suelo lo
calcula la app que dimensiona la fundación, a partir de su geometría.

## Los tres criterios que hay que conocer

- **Se traduce el nombre de las columnas, no el signo.** `N` es positiva en **compresión**
  sobre el apoyo. Si tu modelo da la reacción vertical positiva hacia arriba, hay que
  invertirla: ningún control automático distingue un signo mal de una tracción real.
- **El peso propio acompaña al peso de estado.** CYPE lo entrega como hipótesis aparte, así
  que una combinación que diga sólo `1,20·Do` deja afuera el peso de la estructura. Los sets
  de esta app llevan `PP` con el mismo factor.
- **El traslado suma con signo** (`M + V·h`), igual que las apps de bases y de soporte
  elevado, para que las tres se puedan pasar números. Si los signos de la planilla no son de
  fiar, hay un modo de **envolvente conservadora** que hace crecer el momento siempre.

## Desarrollo

```
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm test         # suite vitest
```

Los tests corren solos en GitHub Actions en cada push a `main` y en cada PR.

## Licencia

Uso interno.
