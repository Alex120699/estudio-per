import datos from '../../data/laminas.json'

/** Lámina de elaboración propia (SVG en public/img/laminas) que ilustra un concepto. */
export interface Lamina {
  id: string
  titulo: string
  /** Ruta relativa a la base de la app, p. ej. «img/laminas/ut1-planta.svg». */
  archivo: string
}

interface Datos {
  laminas: Record<string, Omit<Lamina, 'id'>>
  /** id de pregunta → ids de las láminas que la ilustran. */
  preguntas: Record<string, string[]>
}

const { laminas, preguntas } = datos as Datos

export const todasLasLaminas = (): Lamina[] => Object.entries(laminas).map(([id, l]) => ({ id, ...l }))

export const laminasDe = (idPregunta: string): Lamina[] =>
  (preguntas[idPregunta] ?? []).map((id) => ({ id, ...laminas[id] }))

export const preguntasConLamina = (): Record<string, string[]> => preguntas
