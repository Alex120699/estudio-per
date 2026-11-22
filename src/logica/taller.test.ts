import { describe, expect, it } from 'vitest'
import faros from '../../data/faros.json'
import { azarFijo, esCorrecta, leerRespuesta, lecciones, type PuntoCarta } from './taller'

const L = lecciones((faros as { puntos: Record<string, PuntoCarta> }).puntos)

describe('taller de carta', () => {
  it('lee respuestas con signo, coma y NE/NW', () => {
    expect(leerRespuesta('-3')).toBe(-3)
    expect(leerRespuesta('−3,5')).toBe(-3.5)
    expect(leerRespuesta('3 NW')).toBe(-3)
    expect(leerRespuesta('3,5º NE')).toBe(3.5)
    expect(leerRespuesta('+4')).toBe(4)
    expect(leerRespuesta('045')).toBe(45)
    expect(leerRespuesta('hola')).toBeNull()
  })

  it('compara rumbos en círculo', () => {
    const p = { pregunta: '', tipo: 'numero', clase: 'rumbo', respuesta: 359.6, margen: 0.5, pista: '', solucion: '' } as const
    expect(esCorrecta(p, 0)).toBe(true)
    expect(esCorrecta(p, 359)).toBe(false)
  })

  it('cada lección genera ejercicios válidos y la respuesta exacta se da por buena', () => {
    for (const l of L) {
      const azar = azarFijo(l.numero * 1000)
      for (let i = 0; i < 300; i++) {
        const e = l.generar(azar)
        expect(e.enunciado, l.id).not.toMatch(/NaN|undefined/)
        expect(e.pasos.length, l.id).toBeGreaterThan(0)
        for (const p of e.pasos) {
          expect(Number.isFinite(p.respuesta), `${l.id}: ${e.enunciado}`).toBe(true)
          expect(p.solucion + p.pregunta + p.pista, l.id).not.toMatch(/NaN|undefined/)
          expect(esCorrecta(p, p.respuesta), p.solucion).toBe(true)
          if (p.clase === 'rumbo') expect(p.respuesta).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('la solución escrita da por buena la respuesta redondeada', () => {
    for (const l of L) {
      const azar = azarFijo(7 + l.numero)
      for (let i = 0; i < 200; i++)
        for (const p of l.generar(azar).pasos) if (p.tipo === 'numero') expect(esCorrecta(p, Math.round(p.respuesta * 10) / 10), p.solucion).toBe(true)
    }
  })
})
