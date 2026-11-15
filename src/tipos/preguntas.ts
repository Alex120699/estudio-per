import datos from '../../data/preguntas.json'

export interface Fuente {
  comunidad: string
  convocatoria: string
  modelo: string
  numero: number
  url: string
  plantilla?: string
  /** Errata oficial aplicada a la plantilla, si la hubo. */
  correccion?: string
}

export interface Pregunta {
  id: string
  unidad: number
  enunciado: string
  opciones: [string, string, string, string]
  /** Índice 0–3 de la opción correcta. */
  correcta: number
  explicacion?: string
  imagen?: string
  requiereCarta: boolean
  requiereImagen?: boolean
  fuentes: Fuente[]
}

export const preguntas = datos as Pregunta[]
