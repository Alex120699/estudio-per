import datos from '../../data/explicaciones.json'

export interface Explicacion {
  /** Apartado del programa (y de los apuntes) donde se explica, p. ej. «2.3». */
  apartado: string
  texto: string
  /** La respuesta oficial es discutible: por qué. */
  duda?: string
}

const explicaciones = (datos as { explicaciones: Record<string, Explicacion> }).explicaciones

export const explicacionDe = (id: string): Explicacion | undefined => explicaciones[id]

export const idsConExplicacion = (): string[] => Object.keys(explicaciones)
