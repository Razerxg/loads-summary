// AVISO DE QUE SE TOCÓ LA MATRIZ DEL USUARIO.
//
// `engine/migrar.js` le agrega a un proyecto viejo la hipótesis que el programa incorporó
// después —`Ds`— y le copia el coeficiente de `PP`. Eso CAMBIA los números que el usuario
// venía viendo, así que no puede pasar en silencio: una migración muda es un cambio de
// resultados sin autor, y el que lo note va a sospechar de la app entera.
//
// Se muestra en las dos pantallas donde el cambio se ve —la matriz y los resultados— y se
// queda hasta que se lo acepta. No es un toast: un toast de dos segundos sobre un cambio que
// altera todas las combinaciones es lo mismo que no avisar.
import { Card, Boton } from './ui.jsx';
import { c, t, SP } from './tokens.js';
import { useProyecto } from '../context/ProyectoContext.jsx';

export function AvisoMigracion() {
  const { migracion, cerrarMigracion, irA } = useProyecto();
  if (!migracion) return null;
  const { hip, rotulo, enLista, combos, sinRef } = migracion;

  return (
    <Card tono="aviso" titulo={`Se actualizó el proyecto: se agregó «${hip}»`}
      acciones={<Boton onClick={cerrarMigracion}>Entendido</Boton>}>
      <div style={{ ...t.body, color: c.txt }}>
        Este proyecto venía guardado de <b>antes</b> de que la app tuviera la hipótesis
        <code> {hip}</code> — {rotulo.toLowerCase()} —, así que no la tenía
        {enLista && <> en la lista de hipótesis ni</>} en las matrices de combinación.
        <br /><br />
        <b>Por qué importa:</b> sin la columna <code>φ{hip}</code>, el peso que cargues en
        Niveles se multiplica por cero y <b>no aparece en ningún total</b>. No da error: el
        número simplemente no se mueve, y eso sólo se nota rehaciendo la cuenta a mano.
        <br /><br />
        {combos > 0 && (<>
          Se le puso <code>φ{hip}</code> a <b>{combos} combinaciones</b>, con el
          <b> mismo coeficiente que <code>φPP</code></b> en cada una: <code>{hip}</code> es una
          carga permanente más, así que lleva 1,40 donde va 1,40 y queda minorada a 0,90 / 0,60
          en las de levantamiento, que es donde minorarla es lo conservador.
        </>)}
        {!!sinRef.length && (
          <div style={{ marginTop: SP.md }}>
            <b style={{ color: c.ambar }}>Quedaron {sinRef.length} sin completar:</b>{" "}
            <code>{sinRef.join(", ")}</code>. Esas combinaciones no tienen <code>PP</code>, así
            que no hay de dónde deducir el coeficiente y <b>no se inventó ninguno</b>. Si
            corresponde que <code>{hip}</code> participe en ellas, cargalo a mano.
          </div>
        )}
        <div style={{ marginTop: SP.md }}>
          <Boton onClick={() => irA("Combinaciones")}>Ver las matrices →</Boton>
        </div>
      </div>
    </Card>
  );
}
