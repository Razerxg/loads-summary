// MATRICES DE COMBINACIÓN — el set patrón y los sets por normativa.
//
// Adaptados de `bases-v-0.1`, con UN cambio de fondo que hay que tener presente al leer
// cualquier fila de acá:
//
// ⚠ **EL «PESO PROPIO» ACOMPAÑA AL PESO DE ESTADO CON EL MISMO FACTOR.**
//
// En bases, las hipótesis `De`/`Do`/`Dt` son PESOS TOTALES por estado —el importador le
// sumaba el peso propio de CYPE a las tres— así que una combinación escribía `1,2·Do` y con
// eso ya estaba todo el peso adentro. Acá el peso propio es una hipótesis aparte, `PP`,
// porque es como lo entrega CYPE y porque esta app no interpreta qué significa cada
// hipótesis. Consecuencia directa: una combinación que diga sólo `1,2·Do` DEJA AFUERA el
// peso propio de la estructura. Por eso todas las de abajo llevan `PP` con el mismo factor
// que el peso de estado que las acompaña.
//
// Si el modelo de CYPE ya tuviera el peso propio incluido dentro de `Do` —pasa, cuando el
// proyectista lo carga como carga muerta en vez de dejar que el programa lo calcule—,
// entonces `PP` va a venir en cero o directamente no va a estar, y estas combinaciones
// siguen dando bien. El caso que sí se rompe es el inverso: sacar `PP` de la matriz
// «porque ya está en Do» cuando no lo está. De ahí que venga puesto por defecto.
//
// ⚠ Los coeficientes son los de las combinaciones ESTÁNDAR de cada código (ASCE 7-16
// §2.3/§2.4; ACI 318-19, que las adopta; CIRSOC 201 en marco LRFD; PIP STC01015). Se cargan
// como PUNTO DE PARTIDA EDITABLE: verificá los factores contra la edición vigente aplicable
// al proyecto antes de emitir nada.
import { VIENTOS, PSV } from './hipotesis.js';

export const mkCombo = (f) => ({ k: Math.random().toString(36).slice(2), f });

// helpers: replican una combinación en las direcciones/sentidos de una acción
const dir2 = (base, kx, ky, f) => [{ ...base, [kx]: f }, { ...base, [ky]: f }];
// el viento va en los CUATRO sentidos: cada uno es un caso de carga distinto, y no son
// intercambiables —uno gobierna el despegue y el otro el deslizamiento—
const dir4 = (base, f) => VIENTOS.map(w => ({ ...base, [w]: f }));
// F1/F2 SÓLO con operación: son el empuje de reacción del disparo de una válvula de
// seguridad, que sólo puede ocurrir con el equipo en servicio. NINGUNA de estas normas
// contempla el caso; el factor 1,0 como acción accidental es criterio adoptado.
const psv = (base, f = 1.0) => PSV.map(k => ({ ...base, [k]: f }));

// ── SET PATRÓN ──────────────────────────────────────────────────────────────────
export const DEF_ELU = [
  { PP: 1.4, De: 1.4 }, { PP: 1.4, Do: 1.4 }, { PP: 1.4, Dt: 1.4 },
  { PP: 1.2, De: 1.2, L: 1.6, S: 0.5 }, { PP: 1.2, Do: 1.2, L: 1.6, S: 0.5 },
  { PP: 1.2, Do: 1.2, S: 1.6, L: 1.0 },
  ...dir4({ PP: 1.2, Do: 1.2, L: 1.0, S: 0.5 }, 1.0),
  ...dir4({ PP: 1.2, De: 1.2 }, 1.0),
  ...dir2({ PP: 1.2, Do: 1.2, L: 1.0, S: 0.2 }, "Eox", "Eoy", 1.0),
  ...dir2({ PP: 1.2, De: 1.2 }, "Eex", "Eey", 1.0),
  // 0,9 sobre las permanentes: es la que gobierna el levantamiento
  ...dir4({ PP: 0.9, De: 0.9 }, 1.0),
  ...dir2({ PP: 0.9, De: 0.9 }, "Eex", "Eey", 1.0),
  { PP: 1.2, Do: 1.2, Ts: 1.2 },
  ...psv({ PP: 1.2, Do: 1.2, L: 1.0 }),
];

export const DEF_ELS = [
  { PP: 1, De: 1 }, { PP: 1, Do: 1 }, { PP: 1, Dt: 1 },
  { PP: 1, Do: 1, L: 1 }, { PP: 1, Do: 1, S: 1 },
  ...dir4({ PP: 1, Do: 1 }, 0.6),
  ...dir2({ PP: 1, Do: 1 }, "Eox", "Eoy", 0.7),
  ...dir4({ PP: 0.6, De: 0.6 }, 0.6),
  ...dir2({ PP: 0.6, De: 0.6 }, "Eex", "Eey", 0.7),
  { PP: 1, Do: 1, Ts: 1 },
  { PP: 1, Dt: 1, "Wx+": 0.3 },
  ...psv({ PP: 1, Do: 1 }),
];

// ── SETS POR NORMATIVA ──────────────────────────────────────────────────────────

// CIRSOC 201 §9.2 (LRFD): viento de servicio mayorado (1,6W / 0,8W), sismo 1,0E.
const ELU_CIRSOC = [
  { PP: 1.4, De: 1.4 }, { PP: 1.4, Do: 1.4 }, { PP: 1.4, Dt: 1.4 },
  { PP: 1.2, Do: 1.2, L: 1.6, S: 0.5 },
  { PP: 1.2, Do: 1.2, S: 1.6, L: 1.0 },
  ...dir4({ PP: 1.2, Do: 1.2, S: 1.6, L: 1.0 }, 0.8),
  ...dir4({ PP: 1.2, Do: 1.2, L: 1.0, S: 0.5 }, 1.6),
  ...dir2({ PP: 1.2, Do: 1.2, L: 1.0, S: 0.2 }, "Eox", "Eoy", 1.0),
  ...dir4({ PP: 0.9, De: 0.9 }, 1.6),
  ...dir2({ PP: 0.9, De: 0.9 }, "Eex", "Eey", 1.0),
  { PP: 1.2, Do: 1.2, Ts: 1.2 },
  ...psv({ PP: 1.2, Do: 1.2, L: 1.0 }),
];

// ASCE 7-16 §2.3.1 — viento ya a nivel de resistencia (1,0W). ACI 318-19 §5.3 las adopta.
const ELU_ASCE716 = [
  { PP: 1.4, De: 1.4 }, { PP: 1.4, Do: 1.4 }, { PP: 1.4, Dt: 1.4 },
  { PP: 1.2, Do: 1.2, L: 1.6, S: 0.5 },
  { PP: 1.2, Do: 1.2, S: 1.6, L: 1.0 },
  ...dir4({ PP: 1.2, Do: 1.2, S: 1.6, L: 1.0 }, 0.5),
  ...dir4({ PP: 1.2, Do: 1.2, L: 1.0, S: 0.5 }, 1.0),
  ...dir2({ PP: 1.2, Do: 1.2, L: 1.0, S: 0.2 }, "Eox", "Eoy", 1.0),
  ...dir4({ PP: 0.9, De: 0.9 }, 1.0),
  ...dir2({ PP: 0.9, De: 0.9 }, "Eex", "Eey", 1.0),
  { PP: 1.2, Do: 1.2, Ts: 1.2 },
  ...psv({ PP: 1.2, Do: 1.2, L: 1.0 }),
];

// PIP STC01015 (rev. abril 2017) — Tabla 5, Strength Design. Distingue operación, vacío y
// prueba, con térmica sostenida al peso y casos de levantamiento a 0,9D.
const ELU_PIP = [
  { PP: 1.4, Do: 1.4 }, { PP: 1.4, Dt: 1.4 },
  { PP: 1.2, Do: 1.2, L: 1.6, S: 0.5 },
  { PP: 1.2, Do: 1.2, S: 1.6, L: 1.0 },
  ...dir4({ PP: 1.2, Do: 1.2, L: 1.0, S: 0.5 }, 1.0),
  ...dir4({ PP: 1.2, Dt: 1.2 }, 0.5),
  ...dir2({ PP: 1.2, Do: 1.2, L: 1.0, S: 0.2 }, "Eox", "Eoy", 1.0),
  ...dir4({ PP: 0.9, Do: 0.9 }, 1.0),
  ...dir4({ PP: 0.9, De: 0.9 }, 1.0),
  ...dir2({ PP: 0.9, Do: 0.9 }, "Eox", "Eoy", 1.0),
  ...dir2({ PP: 0.9, De: 0.9 }, "Eex", "Eey", 1.0),
  { PP: 1.2, Do: 1.2, Ts: 1.2 },
  ...psv({ PP: 1.2, Do: 1.2, L: 1.0 }),
];

export const NORMATIVAS_ELU = {
  pp: { label: "Set patrón de la app", combos: DEF_ELU,
    nota: "El que rige por defecto. Se ofrece en el selector para poder volver a él después de probar otra norma." },
  cirsoc: { label: "CIRSOC 201 (LRFD)", combos: ELU_CIRSOC,
    nota: "Resistencia según CIRSOC 201 §9.2: viento de servicio mayorado (1,6W / 0,8W) y sismo 1,0E. Difiere del set ACI/ASCE en el factor de viento —allá 1,0W, por venir ya a nivel de resistencia—." },
  aci318: { label: "ACI 318-19 (adopta ASCE 7-16)", combos: ELU_ASCE716,
    nota: "ACI 318-19 §5.3 remite a las combinaciones de resistencia de ASCE 7-16 (viento 1,0W)." },
  asce716: { label: "ASCE 7-16 (§2.3.1)", combos: ELU_ASCE716,
    nota: "Combinaciones básicas de resistencia (LRFD) de ASCE 7-16, con viento a nivel de resistencia (1,0W)." },
  pip: { label: "PIP STC01015 (Tabla 5, resistencia)", combos: ELU_PIP,
    nota: "PIP STC01015 «Structural Design Criteria» (rev. abril 2017), Tabla 5 — Strength Design. Distingue operación (Do), vacío (De) y prueba (Dt), con térmica sostenida al peso y casos de levantamiento por viento y sismo a 0,9D." },
};

// CIRSOC 201 (tensiones admisibles): viento de servicio 1,0W, sismo 0,7E, levantamiento 0,6D.
const ELS_CIRSOC = [
  { PP: 1, De: 1 }, { PP: 1, Do: 1 }, { PP: 1, Dt: 1 },
  { PP: 1, Do: 1, L: 1 }, { PP: 1, Do: 1, S: 1 },
  ...dir4({ PP: 1, Do: 1 }, 1),
  ...dir4({ PP: 1, Do: 1, S: 0.75, L: 0.75 }, 0.75),
  ...dir2({ PP: 1, Do: 1 }, "Eox", "Eoy", 0.7),
  ...dir4({ PP: 0.6, De: 0.6 }, 1),
  ...dir2({ PP: 0.6, De: 0.6 }, "Eex", "Eey", 0.7),
  { PP: 1, Do: 1, Ts: 1 },
  ...psv({ PP: 1, Do: 1 }),
];

// ASCE 7-16 §2.4.1 (ASD): viento 0,6W, sismo 0,7E, factor 0,75 en simultáneas.
const ELS_ASCE716 = [
  { PP: 1, De: 1 }, { PP: 1, Do: 1 }, { PP: 1, Dt: 1 },
  { PP: 1, Do: 1, L: 1 }, { PP: 1, Do: 1, S: 1 },
  ...dir4({ PP: 1, Do: 1 }, 0.6),
  ...dir4({ PP: 1, Do: 1, S: 0.75, L: 0.75 }, 0.45),
  ...dir2({ PP: 1, Do: 1 }, "Eox", "Eoy", 0.7),
  ...dir4({ PP: 0.6, De: 0.6 }, 0.6),
  ...dir2({ PP: 0.6, De: 0.6 }, "Eex", "Eey", 0.7),
  { PP: 1, Do: 1, Ts: 1 },
  ...psv({ PP: 1, Do: 1 }),
];

// PIP STC01015 — Tabla 4, ASD. Casos de levantamiento por viento (4-7) y sismo (4-8) en
// operación y en vacío, con 0,6D.
const ELS_PIP = [
  { PP: 1, Do: 1 }, { PP: 1, Dt: 1 },
  { PP: 1, Do: 1, L: 1 }, { PP: 1, Do: 1, S: 1 },
  ...dir4({ PP: 1, Do: 1 }, 0.6),
  ...dir4({ PP: 1, Do: 1, S: 0.75, L: 0.75 }, 0.45),
  ...dir4({ PP: 0.6, Do: 0.6 }, 0.6),
  ...dir4({ PP: 0.6, De: 0.6 }, 0.6),
  ...dir2({ PP: 1, Do: 1 }, "Eox", "Eoy", 0.7),
  ...dir2({ PP: 0.6, Do: 0.6 }, "Eox", "Eoy", 0.7),
  ...dir2({ PP: 0.6, De: 0.6 }, "Eex", "Eey", 0.7),
  { PP: 1, Do: 1, Ts: 1 },
  ...psv({ PP: 1, Do: 1 }),
];

export const NORMATIVAS_ELS = {
  pp: { label: "Set patrón de la app", combos: DEF_ELS,
    nota: "El que rige por defecto. Se ofrece en el selector para poder volver a él después de probar otra norma." },
  cirsoc: { label: "CIRSOC 201", combos: ELS_CIRSOC,
    nota: "Servicio (tensiones admisibles) del CIRSOC 201: viento de servicio 1,0W y sismo 0,7E, levantamientos a 0,6D." },
  aci318: { label: "ACI 318-19 (adopta ASCE 7-16)", combos: ELS_ASCE716,
    nota: "Combinaciones de servicio (ASD) de ASCE 7-16 §2.4.1, adoptadas por ACI 318." },
  asce716: { label: "ASCE 7-16 (§2.4.1)", combos: ELS_ASCE716,
    nota: "Combinaciones ASD de ASCE 7-16: viento 0,6W, sismo 0,7E, factor 0,75 en simultáneas." },
  pip: { label: "PIP STC01015 (Tabla 4, servicio)", combos: ELS_PIP,
    nota: "PIP STC01015 «Structural Design Criteria» (rev. abril 2017), Tabla 4 — Allowable Stress Design. Casos de levantamiento por viento (4-7) y sismo (4-8) en operación y en vacío con 0,6D." },
};
