// Progreso del Taller de carta, por lección, en localStorage (no entra en el historial de preguntas).

const CLAVE = 'per.taller'

export interface ProgresoLeccion {
  /** Ejercicios terminados. */
  hechos: number
  /** Terminados sin fallar ningún paso a la primera. */
  limpios: number
}

export function cargarProgreso(): Record<string, ProgresoLeccion> {
  try {
    const raw = localStorage.getItem(CLAVE)
    const p = raw ? (JSON.parse(raw) as Record<string, ProgresoLeccion>) : {}
    return p && typeof p === 'object' ? p : {}
  } catch {
    return {}
  }
}

export function sumarEjercicio(leccion: string, limpio: boolean): Record<string, ProgresoLeccion> {
  const p = cargarProgreso()
  const a = p[leccion] ?? { hechos: 0, limpios: 0 }
  p[leccion] = { hechos: a.hechos + 1, limpios: a.limpios + (limpio ? 1 : 0) }
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p))
  } catch {
    // Sin almacenamiento: el progreso solo vive mientras la app está abierta.
  }
  return p
}
