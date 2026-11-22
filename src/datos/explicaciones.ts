import datos from '../../data/explicaciones.json'

export interface Explicacion {
  /** Apartado del programa (y de los apuntes) donde se explica, p. ej. «2.3». */
  apartado: string
  texto: string
  /** La respuesta oficial es discutible: por qué. */
  duda?: string
  /** Por qué falla cada opción, en el orden de las opciones; la correcta va vacía. */
  opciones?: string[]
}

const explicaciones = (datos as { explicaciones: Record<string, Explicacion> }).explicaciones

export const explicacionDe = (id: string): Explicacion | undefined => explicaciones[id]

/** Motivo por el que la opción k no es la buena (vacío si no hay o si es la correcta). */
export const motivoDe = (id: string, k: number): string => explicaciones[id]?.opciones?.[k] ?? ''

export const idsConExplicacion = (): string[] => Object.keys(explicaciones)
