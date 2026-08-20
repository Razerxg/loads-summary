// ESTADO GLOBAL DEL PROYECTO — hipótesis, nudos, combinaciones y niveles.
//
// Autoguardado en `localStorage` en cada cambio, y export/import a un `.reacciones.json`.
// El autoguardado no es un lujo: la entrada de esta app es una planilla que se importa una
// vez y una matriz de combinaciones que se tipea a mano, y perder eso por cerrar una
// pestaña sería perder toda la sesión.
import { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { HIPS_DEF, agregarHips, quitarHip } from '../constants/hipotesis.js';
import { migrarProyecto } from '../engine/migrar.js';
import { DEF_ELU, DEF_ELS, mkCombo } from '../constants/combosDef.js';
import { COMP_KEYS } from '../constants/componentes.js';
import { calcular } from '../engine/combinar.js';
import { sumarNudos } from '../engine/conjunto.js';
import { MODO_DEF, mkNivel, nivelesOrdenados } from '../engine/traslado.js';
import { TABS } from '../constants/tabs.js';

const Ctx = createContext(null);
export const useProyecto = () => useContext(Ctx);

const CLAVE = "reacciones.v1";
export const ARCHIVO_TIPO = "reacciones.proyecto";

let seqNudo = 0;
// `pos` es la posición del nudo EN PLANTA respecto del eje de la fundación, con signo y en
// metros. Sólo interviene en modo conjunto (ver engine/planta.js); en cero es exactamente el
// comportamiento anterior, que es lo que hace que los proyectos guardados no cambien.
export const mkNudo = (nombre = "N1", cargas = {}, pos = { x: 0, y: 0 }) =>
  ({ id: `nd${++seqNudo}${Math.random().toString(36).slice(2, 6)}`, nombre, cargas,
     pos: { x: Number(pos?.x) || 0, y: Number(pos?.y) || 0 } });

// ── ESTADO INICIAL ──────────────────────────────────────────────────────────────
//
// Se arranca con UN nudo vacío y las combinaciones patrón. No hay proyecto de ejemplo con
// números cargados, y es a propósito: en `bases-v-0.1` el ejemplo dejó cargas viejas
// mezcladas con las importadas más de una vez —la planilla no traía todas las hipótesis y
// las que faltaban conservaban los valores del ejemplo—, y eso no falla, da un resultado
// plausible y equivocado.
const inicial = () => ({
  proyecto: "",
  hips: [...HIPS_DEF],
  nudos: [mkNudo("N1")],
  nudoAct: 0,
  // MODO CONJUNTO: los nudos incluidos apoyan sobre UNA MISMA fundación y sus cargas se
  // suman. Arranca apagado porque el otro caso —un nudo, una base— es el que no necesita
  // ninguna decisión previa, y encender la suma sin querer cambiaría todos los números de
  // golpe sin que nada lo delate.
  conjunto: false,
  combosU: DEF_ELU.map(f => mkCombo({ ...f })),
  combosS: DEF_ELS.map(f => mkCombo({ ...f })),
  niveles: [],
  modo: MODO_DEF,
});

// Lo que se persiste. Las claves `k`/`id` de sesión SÍ se guardan acá —a diferencia del
// archivo exportado— porque restaurar el estado tal cual es justamente lo que se busca.
// ⚠ SE MIGRA AL ABRIR, y el resultado se informa.
//
// Un proyecto guardado ANTES de que el programa agregara una hipótesis no la tiene ni en la
// lista ni en las matrices. El usuario carga el valor, ve el campo lleno, y el número no
// cambia en ninguna tabla: multiplicado por cero, sin ningún error. Ver `engine/migrar.js`.
let ultimaMigracion = null;
const cargarLocal = () => {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE) || "null");
    if (!crudo || typeof crudo !== "object") return null;
    const { estado: d, cambios } = migrarProyecto(crudo, { ordenCatalogo: HIPS_DEF });
    ultimaMigracion = cambios;
    const base = inicial();
    return {
      ...base, ...d,
      // Las listas se validan mínimamente: un localStorage corrupto o de una versión
      // anterior no puede dejar la app sin nudos ni sin hipótesis, que la rompería entera.
      hips: Array.isArray(d.hips) && d.hips.length ? d.hips : base.hips,
      nudos: Array.isArray(d.nudos) && d.nudos.length ? d.nudos : base.nudos,
      combosU: Array.isArray(d.combosU) ? d.combosU : base.combosU,
      combosS: Array.isArray(d.combosS) ? d.combosS : base.combosS,
      niveles: Array.isArray(d.niveles) ? d.niveles : [],
    };
  } catch { return null; }
};

export function ProyectoProvider({ children }) {
  const [st, setSt] = useState(() => (typeof localStorage !== "undefined" ? cargarLocal() : null) || inicial());
  const [tab, setTab] = useState(0);
  // El parte de la migración vive APARTE del proyecto: es de esta sesión y no algo que haya
  // que volver a guardar. Se muestra hasta que el usuario lo acepta.
  const [migracion, setMigracion] = useState(() => ultimaMigracion);

  useEffect(() => {
    try { localStorage.setItem(CLAVE, JSON.stringify(st)); } catch { /* cupo lleno: no rompe nada */ }
  }, [st]);

  const set = useCallback((parche) => setSt(s => ({ ...s, ...(typeof parche === "function" ? parche(s) : parche) })), []);

  // ── NUDOS ──
  const nudoAct = st.nudos[Math.min(st.nudoAct, st.nudos.length - 1)] || st.nudos[0];
  const setCargas = useCallback((idNudo, cargas) => setSt(s => ({
    ...s, nudos: s.nudos.map(n => n.id === idNudo ? { ...n, cargas } : n),
  })), []);
  // Editar UNA componente de UNA hipótesis. Los campos son `<input type="number">`, así que
  // llegan como STRING: se convierten acá y no en cada pantalla. Es el bug que en
  // soporte-elevado-v4 imprimió «—» en todos los parámetros del sitio.
  const setCarga = useCallback((idNudo, hip, comp, valor) => setSt(s => ({
    ...s, nudos: s.nudos.map(n => {
      if (n.id !== idNudo) return n;
      const v = valor === "" || valor === null ? undefined : Number(valor);
      const c = { ...(n.cargas[hip] || {}) };
      if (v === undefined || !Number.isFinite(v)) delete c[comp]; else c[comp] = v;
      return { ...n, cargas: { ...n.cargas, [hip]: c } };
    }),
  })), []);

  // Posición en planta del nudo. Los campos son `<input type="number">` → llegan STRING.
  const setPos = useCallback((idNudo, eje, valor) => setSt(s => ({
    ...s, nudos: s.nudos.map(n => n.id !== idNudo ? n
      : { ...n, pos: { ...{ x: 0, y: 0 }, ...n.pos, [eje]: Number(valor) || 0 } }),
  })), []);

  const addNudo = useCallback(() => setSt(s => {
    const n = mkNudo(`N${s.nudos.length + 1}`);
    return { ...s, nudos: [...s.nudos, n], nudoAct: s.nudos.length };
  }), []);
  const delNudo = useCallback((id) => setSt(s => {
    // Nunca quedarse sin ninguno: sin nudo no hay nada que combinar y la app queda en una
    // pantalla vacía sin forma de salir.
    if (s.nudos.length <= 1) return s;
    const nudos = s.nudos.filter(n => n.id !== id);
    return { ...s, nudos, nudoAct: Math.min(s.nudoAct, nudos.length - 1) };
  }), []);

  // ── HIPÓTESIS ──
  const addHips = useCallback((nuevas) => {
    let puestas = [];
    setSt(s => {
      const r = agregarHips(s.hips, nuevas);
      puestas = r.puestas;
      return { ...s, hips: r.hips };
    });
    return puestas;
  }, []);
  const delHip = useCallback((k) => setSt(s => ({ ...s, ...quitarHip(k, s) })), []);

  // ── NIVELES ──
  const addNivel = useCallback(() => setSt(s => ({
    ...s, niveles: [...s.niveles, mkNivel(`Nivel ${s.niveles.length + 1}`, 1)],
  })), []);
  const setNivel = useCallback((id, parche) => setSt(s => ({
    ...s, niveles: s.niveles.map(n => n.id === id ? { ...n, ...parche } : n),
  })), []);
  const delNivel = useCallback((id) => setSt(s => ({ ...s, niveles: s.niveles.filter(n => n.id !== id) })), []);

  // ── CÁLCULO ──
  //
  // Un resultado POR NIVEL, para el nudo activo. Se calcula todo junto y no de a un nivel
  // por vez porque la pantalla de resultados los muestra uno debajo del otro y compararlos
  // es justamente para lo que existe la app.
  const niveles = useMemo(() => nivelesOrdenados(st.niveles), [st.niveles]);
  // ── DE DÓNDE SALEN LAS CARGAS ──
  //
  // Un nudo, o la suma de los incluidos en el conjunto. La decisión se toma UNA vez acá y
  // todo lo de abajo —tablas, envolventes, memoria, CSV— consume el mismo objeto: si cada
  // pantalla resolviera por su cuenta de dónde sacar las cargas, alcanzaría con que una se
  // olvidara del modo conjunto para que mostrara un nudo suelto con el rótulo del conjunto.
  const incluidos = useMemo(() => st.nudos.filter(n => n.incluido !== false), [st.nudos]);
  const suma = useMemo(() => (st.conjunto ? sumarNudos(incluidos) : null), [st.conjunto, incluidos]);
  const cargasBase = st.conjunto ? (suma?.cargas || {}) : (nudoAct?.cargas || {});

  // En modo conjunto, una hipótesis que sólo trajo alguno de los nudos existe igual en el
  // total: se agrega a la lista viva para que tenga columna en la matriz y fila en las
  // tablas. Sin esto, una hipótesis presente en un solo nudo sumaría en silencio.
  const hipsEfectivas = useMemo(() => {
    if (!st.conjunto) return st.hips;
    const extra = (suma?.hips || []).filter(h => !st.hips.includes(h));
    return extra.length ? [...st.hips, ...extra] : st.hips;
  }, [st.conjunto, st.hips, suma]);

  const porNivel = useMemo(() => niveles.map(nv => ({
    nivel: nv,
    ...calcular({
      cargas: cargasBase, hips: hipsEfectivas,
      combosU: st.combosU, combosS: st.combosS, h: nv.h, modo: st.modo,
      // El peso propio de la fundación es del NIVEL: cada cota acumula lo que haya entre
      // ella y el nudo. El de referencia lo lleva en cero por definición.
      ds: nv.fijo ? 0 : nv.ds,
    }),
  })), [niveles, cargasBase, hipsEfectivas, st.combosU, st.combosS, st.modo]);

  // ── ARCHIVO ──
  const exportar = useCallback(() => ({
    tipo: ARCHIVO_TIPO, version: 1, generado: new Date().toISOString(),
    proyecto: st.proyecto, hips: st.hips, modo: st.modo, conjunto: st.conjunto,
    nudos: st.nudos.map(n => ({ nombre: n.nombre, cargas: n.cargas, incluido: n.incluido !== false })),
    niveles: st.niveles.map(n => ({ nombre: n.nombre, h: n.h, ds: n.ds })),
    // Sin las claves `k` de sesión: son `Math.random()` y no significan nada fuera de ella.
    combos: { ELU: st.combosU.map(c => c.f), ELS: st.combosS.map(c => c.f) },
  }), [st]);

  const importar = useCallback((d) => {
    if (!d || typeof d !== "object") return { ok: false, error: "El archivo no es JSON válido." };
    if (d.tipo && d.tipo !== ARCHIVO_TIPO) {
      return { ok: false, error: `El archivo dice ser «${d.tipo}», no un proyecto de reacciones. `
        + "Para traer sólo las matrices usá «Importar set» en la pestaña Combinaciones." };
    }
    const base = inicial();
    // Un `.reacciones.json` guardado antes tiene el mismo problema que el localStorage
    // viejo, así que pasa por la misma migración.
    const mig = migrarProyecto({
      hips: d.hips, combosU: (d.combos?.ELU || []).map(f => ({ f })),
      combosS: (d.combos?.ELS || []).map(f => ({ f })),
    }, { ordenCatalogo: HIPS_DEF });
    setMigracion(mig.cambios);
    setSt({
      proyecto: typeof d.proyecto === "string" ? d.proyecto : "",
      hips: Array.isArray(mig.estado.hips) && mig.estado.hips.length ? mig.estado.hips : base.hips,
      nudos: Array.isArray(d.nudos) && d.nudos.length
        ? d.nudos.map(n => ({ ...mkNudo(n.nombre || "N", n.cargas || {}, n.pos), incluido: n.incluido !== false }))
        : base.nudos,
      nudoAct: 0,
      combosU: Array.isArray(d.combos?.ELU) ? mig.estado.combosU.map(c => mkCombo({ ...c.f })) : base.combosU,
      combosS: Array.isArray(d.combos?.ELS) ? mig.estado.combosS.map(c => mkCombo({ ...c.f })) : base.combosS,
      niveles: Array.isArray(d.niveles)
        ? d.niveles.map(n => mkNivel(n.nombre || "Nivel", Number(n.h) || 0, Number(n.ds) || 0)) : [],
      modo: d.modo === "envolvente" ? "envolvente" : MODO_DEF,
      conjunto: !!d.conjunto,
    });
    return { ok: true };
  }, []);

  const reiniciar = useCallback(() => setSt(inicial()), []);

  const val = {
    ...st, tab, setTab, set, COMP_KEYS,
    nudoAct, setCargas, setCarga, setPos, addNudo, delNudo,
    setNudoAct: (i) => set({ nudoAct: i }),
    addHips, delHip,
    niveles, addNivel, setNivel, delNivel,
    setCombosU: (fn) => set(s => ({ combosU: typeof fn === "function" ? fn(s.combosU) : fn })),
    setCombosS: (fn) => set(s => ({ combosS: typeof fn === "function" ? fn(s.combosS) : fn })),
    porNivel, exportar, importar, reiniciar,
    // El modo conjunto y su resultado: `hips` sale sustituido por la lista EFECTIVA para
    // que ninguna pantalla tenga que acordarse de agregarle las hipótesis del conjunto.
    hips: hipsEfectivas, suma, incluidos, cargasBase,
    migracion, cerrarMigracion: () => setMigracion(null),
    setConjunto: (v) => set({ conjunto: v }),
    setIncluido: (id, v) => set(s => ({
      nudos: s.nudos.map(n => n.id === id ? { ...n, incluido: v } : n),
    })),
    // Se navega POR NOMBRE y no por índice: insertar una pantalla en el medio renumeraba
    // todos los saltos y mandaba a cualquier lado sin que nada fallara.
    irA: (n) => setTab(typeof n === "number" ? n : Math.max(0, TABS.indexOf(n))),
  };
  return <Ctx.Provider value={val}>{children}</Ctx.Provider>;
}
