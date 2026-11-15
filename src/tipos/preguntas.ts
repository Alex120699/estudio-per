import datos from '../../data/preguntas.json'

/** Examen oficial del que salen las preguntas. */
export interface Examen {
  comunidad: string
  convocatoria: string
  modelo: string
  url: string
  plantilla?: string
}

/** Aparición de una pregunta en un examen oficial. */
export interface FuenteRef {
  /** Clave en `examenes`. */
  examen: string
  numero: number
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
  /** Ruta relativa a la raíz del sitio, p. ej. «img/bal-2019-04-A-40.webp». */
  imagen?: string
  requiereCarta: boolean
  requiereImagen?: boolean
  /** Las fuentes oficiales no coincidían y se decidió a mano (scripts/revisiones.json). */
  revision?: string
  fuentes: FuenteRef[]
}

interface Banco {
  examenes: Record<string, Examen>
  preguntas: Pregunta[]
}

const banco = datos as unknown as Banco

export const examenes = banco.examenes
export const preguntas = banco.preguntas
