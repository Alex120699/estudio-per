import faros from '../../data/faros.json'
import datos from '../../data/resoluciones.json'
import { resolver, type Planteamiento, type Punto, type Resolucion } from '../logica/resolucion'

const puntos = (faros as { puntos: Record<string, Punto> }).puntos
const planteamientos = (datos as { resoluciones: Record<string, Planteamiento | { igual: string }> }).resoluciones

export const planteamientoDe = (id: string): Planteamiento | undefined => {
  const p = planteamientos[id]
  return p && 'igual' in p ? (planteamientos[p.igual] as Planteamiento | undefined) : p
}

/** Resolución paso a paso de un ejercicio de carta, si la hay. */
export const resolucionDe = (id: string): Resolucion | undefined => {
  const p = planteamientoDe(id)
  return p && resolver(p, puntos)
}

export const idsConResolucion = (): string[] => Object.keys(planteamientos)
