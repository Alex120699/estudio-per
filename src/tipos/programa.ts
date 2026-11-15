import datos from '../../data/programa.json'

export interface Item {
  texto: string
  sub?: Item[]
}

export interface Apartado {
  codigo: string
  titulo: string
  contenido: Item[]
}

export interface Unidad {
  numero: number
  nombre: string
  /** Nombre corto tal como aparece en el cuadro de reparto del examen. */
  nombreCuadro: string
  bloque: 'PNB' | 'PER'
  preguntas: number
  maxErrores: number | null
  minAciertos: number | null
  maxErroresComplementario: number | null
  minAciertosComplementario: number | null
  apartados: Apartado[]
  excluido: string[]
}

export interface CriteriosExamen {
  preguntas: number
  minAciertos: number
  maxErroresPorUnidad: Record<string, number>
}

export interface Programa {
  fuente: {
    norma: string
    id: string
    url: string
    apartado: string
    redaccionAnexoII: string
    ultimaActualizacionConsolidado: string | null
    generado: string
  }
  examen: {
    completo: CriteriosExamen & { opcionesPorPregunta: number; duracion: string }
    complementarioPNB: CriteriosExamen & {
      descripcion: string
      unidades: number[]
      duracion: string
      maxErroresTotales: number
    }
    equivalenciaPNB: CriteriosExamen & { descripcion: string; unidades: number[] }
    notas: string[]
  }
  unidades: Unidad[]
}

export const programa = datos as Programa
