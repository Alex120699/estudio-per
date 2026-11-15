import type { Programa } from '../tipos/programa'
import type { TipoSimulacro } from './seleccion'

/** Una pregunta del simulacro tal como se corrige: su unidad y si se acertó. Sin responder = no acertada. */
export interface RespuestaCorregible {
  unidad: number
  respondida: boolean
  acierto: boolean
}

export interface ResultadoUnidad {
  unidad: number
  preguntas: number
  aciertos: number
  /** Fallos + en blanco. */
  errores: number
  enBlanco: number
  /** Mínimo de aciertos exigido en la unidad (null si no tiene límite). */
  minAciertos: number | null
  superaLimite: boolean
}

export interface ResultadoSimulacro {
  tipo: TipoSimulacro
  preguntas: number
  aciertos: number
  errores: number
  enBlanco: number
  minAciertos: number
  apto: boolean
  /** Motivos de suspenso en lenguaje claro; vacío si apto. */
  motivos: string[]
  porUnidad: ResultadoUnidad[]
  /** Solo en el examen completo: si con las UT 1–6 se alcanzarían las exigencias del PNB. */
  aptoPNB?: boolean
}

const nombreCorto = (programa: Programa, unidad: number) => programa.unidades.find((u) => u.numero === unidad)?.nombreCuadro ?? `UT${unidad}`

function porUnidad(respuestas: readonly RespuestaCorregible[], unidades: number[], minimos: Record<number, number>): ResultadoUnidad[] {
  return unidades.map((unidad) => {
    const rs = respuestas.filter((r) => r.unidad === unidad)
    const aciertos = rs.filter((r) => r.acierto).length
    const min = minimos[unidad] ?? null
    return {
      unidad,
      preguntas: rs.length,
      aciertos,
      errores: rs.length - aciertos,
      enBlanco: rs.filter((r) => !r.respondida).length,
      minAciertos: min,
      superaLimite: min !== null && aciertos < min,
    }
  })
}

/** Mínimo de aciertos por unidad a partir del máximo de errores (BOE: preguntas − errores permitidos). */
function minimosDesdeErrores(programa: Programa, maxErrores: Record<string, number>): Record<number, number> {
  return Object.fromEntries(
    Object.entries(maxErrores).map(([ut, max]) => {
      const n = programa.unidades.find((u) => u.numero === Number(ut))!.preguntas
      return [Number(ut), n - max]
    }),
  )
}

/**
 * Corrección con el doble criterio del Anexo II del RD 875/2014:
 * mínimo de aciertos total y máximo de errores en ciertas unidades. Una pregunta en
 * blanco no es un acierto, así que cuenta para el máximo de errores de su unidad.
 */
export function corregirSimulacro(programa: Programa, tipo: TipoSimulacro, respuestas: readonly RespuestaCorregible[]): ResultadoSimulacro {
  const criterios = tipo === 'completo' ? programa.examen.completo : programa.examen.complementarioPNB
  const unidades = tipo === 'completo' ? programa.unidades.map((u) => u.numero) : programa.examen.complementarioPNB.unidades
  const minimos = minimosDesdeErrores(programa, criterios.maxErroresPorUnidad)
  const unidadesRes = porUnidad(respuestas, unidades, minimos)

  const aciertos = respuestas.filter((r) => r.acierto).length
  const enBlanco = respuestas.filter((r) => !r.respondida).length
  const motivos: string[] = []
  if (aciertos < criterios.minAciertos) {
    motivos.push(`Nota global: ${aciertos} aciertos de ${respuestas.length}; se necesitan ${criterios.minAciertos}.`)
  }
  for (const u of unidadesRes.filter((x) => x.superaLimite)) {
    const max = u.preguntas - u.minAciertos!
    motivos.push(`${nombreCorto(programa, u.unidad)}: ${u.errores} errores; el máximo permitido es ${max}.`)
  }

  const resultado: ResultadoSimulacro = {
    tipo,
    preguntas: respuestas.length,
    aciertos,
    errores: respuestas.length - aciertos,
    enBlanco,
    minAciertos: criterios.minAciertos,
    apto: motivos.length === 0,
    motivos,
    porUnidad: unidadesRes,
  }

  if (tipo === 'completo') {
    const pnb = programa.examen.equivalenciaPNB
    const rsPnb = respuestas.filter((r) => pnb.unidades.includes(r.unidad))
    const minPnb = minimosDesdeErrores(programa, pnb.maxErroresPorUnidad)
    const okUnidades = porUnidad(rsPnb, pnb.unidades, minPnb).every((u) => !u.superaLimite)
    resultado.aptoPNB = okUnidades && rsPnb.filter((r) => r.acierto).length >= pnb.minAciertos
  }
  return resultado
}
