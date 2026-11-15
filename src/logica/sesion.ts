import type { Pregunta } from '../tipos/preguntas'
import type { Programa } from '../tipos/programa'
import { corregirSimulacro, type RespuestaCorregible, type ResultadoSimulacro } from './correccion'
import type { OpcionesTema, TipoSimulacro } from './seleccion'

/**
 * - estudio: se corrige cada pregunta al responderla.
 * - test: se corrige todo al final (los simulacros siempre van en este modo).
 */
export type Modo = 'estudio' | 'test'

export interface Sesion {
  id: string
  tipo: 'simulacro' | 'tema'
  simulacro?: TipoSimulacro
  modo: Modo
  /** Opciones elegidas (tests por tema), para poder repetir un test igual. */
  opcionesTema?: OpcionesTema
  preguntaIds: string[]
  /** Índice elegido por pregunta, o null si está en blanco. */
  respuestas: (number | null)[]
  actual: number
  inicio: string
  fin?: string
}

export function nuevaSesion(datos: Omit<Sesion, 'id' | 'respuestas' | 'actual' | 'inicio' | 'preguntaIds'> & { preguntas: Pregunta[] }): Sesion {
  const { preguntas, ...resto } = datos
  return {
    ...resto,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    preguntaIds: preguntas.map((p) => p.id),
    respuestas: preguntas.map(() => null),
    actual: 0,
    inicio: new Date().toISOString(),
  }
}

export function responder(s: Sesion, indice: number, opcion: number): Sesion {
  const respuestas = [...s.respuestas]
  respuestas[indice] = opcion
  return { ...s, respuestas }
}

export function irA(s: Sesion, indice: number): Sesion {
  return { ...s, actual: Math.max(0, Math.min(s.preguntaIds.length - 1, indice)) }
}

export function terminar(s: Sesion): Sesion {
  return { ...s, fin: new Date().toISOString() }
}

/** Resuelve los ids contra el banco. Si alguna pregunta ya no existe (banco regenerado), devuelve null. */
export function preguntasDe(s: Sesion, banco: readonly Pregunta[]): Pregunta[] | null {
  const porId = new Map(banco.map((p) => [p.id, p]))
  const ps = s.preguntaIds.map((id) => porId.get(id))
  return ps.every(Boolean) ? (ps as Pregunta[]) : null
}

export function corregibles(s: Sesion, preguntas: readonly Pregunta[]): RespuestaCorregible[] {
  return preguntas.map((p, i) => ({
    unidad: p.unidad,
    respondida: s.respuestas[i] !== null,
    acierto: s.respuestas[i] === p.correcta,
  }))
}

export interface ResumenSesion {
  preguntas: number
  aciertos: number
  fallos: number
  enBlanco: number
  simulacro?: ResultadoSimulacro
}

export function resumir(s: Sesion, preguntas: readonly Pregunta[], programa: Programa): ResumenSesion {
  const rs = corregibles(s, preguntas)
  const aciertos = rs.filter((r) => r.acierto).length
  const enBlanco = rs.filter((r) => !r.respondida).length
  return {
    preguntas: rs.length,
    aciertos,
    fallos: rs.length - aciertos - enBlanco,
    enBlanco,
    ...(s.tipo === 'simulacro' && s.simulacro && { simulacro: corregirSimulacro(programa, s.simulacro, rs) }),
  }
}

// --- Persistencia de la sesión en curso -------------------------------------------
// Una sola sesión abierta a la vez, en localStorage. El historial completo llega en la Fase 3 (IndexedDB).

const CLAVE = 'per.sesionEnCurso'

export function guardarEnCurso(s: Sesion | null): void {
  try {
    if (s && !s.fin) localStorage.setItem(CLAVE, JSON.stringify(s))
    else localStorage.removeItem(CLAVE)
  } catch {
    // Navegador sin almacenamiento (modo privado): la sesión solo vive en memoria.
  }
}

export function cargarEnCurso(): Sesion | null {
  try {
    const raw = localStorage.getItem(CLAVE)
    if (!raw) return null
    const s = JSON.parse(raw) as Sesion
    return Array.isArray(s.preguntaIds) && Array.isArray(s.respuestas) ? s : null
  } catch {
    return null
  }
}
