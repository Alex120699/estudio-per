import type { Pregunta } from '../tipos/preguntas'
import type { Programa } from '../tipos/programa'

export type Rng = () => number

/** Fisher-Yates sobre una copia. */
export function barajar<T>(xs: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Preguntas que se pueden usar hoy: las que remiten a una figura aún no disponible se apartan. */
export function utilizables(banco: readonly Pregunta[]): Pregunta[] {
  return banco.filter((p) => !p.requiereImagen || p.imagen)
}

export type TipoSimulacro = 'completo' | 'complementario'

/** Unidades que entran en cada tipo de simulacro, con su número de preguntas oficial. */
export function repartoSimulacro(programa: Programa, tipo: TipoSimulacro): { unidad: number; n: number }[] {
  const unidades = tipo === 'completo' ? programa.unidades : programa.unidades.filter((u) => programa.examen.complementarioPNB.unidades.includes(u.numero))
  return unidades.map((u) => ({ unidad: u.numero, n: u.preguntas }))
}

/**
 * Simulacro con el mismo reparto por unidades que el examen real, en el orden del
 * examen (UT 1 → UT 11). Lanza un error si alguna unidad no tiene preguntas suficientes.
 */
export function generarSimulacro(banco: readonly Pregunta[], programa: Programa, tipo: TipoSimulacro, rng: Rng = Math.random): Pregunta[] {
  const disponibles = utilizables(banco)
  return repartoSimulacro(programa, tipo).flatMap(({ unidad, n }) => {
    const deLaUnidad = disponibles.filter((p) => p.unidad === unidad)
    if (deLaUnidad.length < n) throw new Error(`UT${unidad}: hay ${deLaUnidad.length} preguntas y el simulacro necesita ${n}`)
    return barajar(deLaUnidad, rng).slice(0, n)
  })
}

/** aleatorias: todas las de las unidades · noVistas: nunca respondidas · falladas: en la caja de fallos. */
export type FiltroTema = 'aleatorias' | 'noVistas' | 'falladas'

export interface OpcionesTema {
  unidades: number[]
  /** Número de preguntas, o 'todas'. */
  cantidad: number | 'todas'
  excluirCarta?: boolean
  filtro?: FiltroTema
}

/** Lo que hace falta del historial para filtrar: ids ya respondidos e ids en la caja de fallos. */
export interface ContextoHistorial {
  vistas: ReadonlySet<string>
  enCaja: ReadonlySet<string>
}

const SIN_HISTORIAL: ContextoHistorial = { vistas: new Set(), enCaja: new Set() }

export function candidatasTema(banco: readonly Pregunta[], opciones: OpcionesTema, hist: ContextoHistorial = SIN_HISTORIAL): Pregunta[] {
  const filtro = opciones.filtro ?? 'aleatorias'
  return utilizables(banco).filter(
    (p) =>
      opciones.unidades.includes(p.unidad) &&
      !(opciones.excluirCarta && p.requiereCarta) &&
      (filtro !== 'noVistas' || !hist.vistas.has(p.id)) &&
      (filtro !== 'falladas' || hist.enCaja.has(p.id)),
  )
}

/** Test por tema: preguntas al azar de las unidades elegidas, con el filtro indicado. */
export function generarTestTema(
  banco: readonly Pregunta[],
  opciones: OpcionesTema,
  rng: Rng = Math.random,
  hist: ContextoHistorial = SIN_HISTORIAL,
): Pregunta[] {
  const candidatas = candidatasTema(banco, opciones, hist)
  const barajadas = barajar(candidatas, rng)
  const n = opciones.cantidad === 'todas' ? barajadas.length : Math.min(opciones.cantidad, barajadas.length)
  return barajadas.slice(0, n)
}

/** Repaso: las preguntas indicadas (pendientes de la caja de fallos), en orden aleatorio. */
export function generarRepaso(banco: readonly Pregunta[], ids: Iterable<string>, rng: Rng = Math.random): Pregunta[] {
  const quiero = new Set(ids)
  return barajar(
    utilizables(banco).filter((p) => quiero.has(p.id)),
    rng,
  )
}
