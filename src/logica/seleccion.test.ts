import { describe, expect, it } from 'vitest'
import { preguntas } from '../tipos/preguntas'
import { programa } from '../tipos/programa'
import { barajar, generarSimulacro, generarTestTema } from './seleccion'

/** Generador determinista (mulberry32) para tests reproducibles. */
function rngFijo(semilla: number) {
  let a = semilla
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('barajar', () => {
  it('no pierde ni repite elementos y no modifica el original', () => {
    const xs = [1, 2, 3, 4, 5, 6]
    const b = barajar(xs, rngFijo(1))
    expect([...b].sort()).toEqual(xs)
    expect(xs).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('generarSimulacro', () => {
  it('completo: 45 preguntas con el reparto oficial y en orden de unidades', () => {
    const s = generarSimulacro(preguntas, programa, 'completo', rngFijo(7))
    expect(s).toHaveLength(45)
    for (const u of programa.unidades) expect(s.filter((p) => p.unidad === u.numero)).toHaveLength(u.preguntas)
    const unidades = s.map((p) => p.unidad)
    expect(unidades).toEqual([...unidades].sort((a, b) => a - b))
    expect(new Set(s.map((p) => p.id)).size).toBe(45)
  })

  it('complementario: 18 preguntas de las UT 7 a 11', () => {
    const s = generarSimulacro(preguntas, programa, 'complementario', rngFijo(7))
    expect(s).toHaveLength(18)
    expect(s.every((p) => p.unidad >= 7)).toBe(true)
  })

  it('no incluye preguntas que necesitan una figura que aún no tenemos', () => {
    for (let i = 0; i < 20; i++) {
      const s = generarSimulacro(preguntas, programa, 'completo', rngFijo(i))
      expect(s.some((p) => p.requiereImagen && !p.imagen)).toBe(false)
    }
  })

  it('falla con un mensaje claro si no hay preguntas suficientes', () => {
    expect(() => generarSimulacro(preguntas.filter((p) => p.unidad !== 11), programa, 'completo')).toThrow(/UT11/)
  })

  it('dos simulacros con distinta semilla no son idénticos', () => {
    const a = generarSimulacro(preguntas, programa, 'completo', rngFijo(1)).map((p) => p.id)
    const b = generarSimulacro(preguntas, programa, 'completo', rngFijo(2)).map((p) => p.id)
    expect(a).not.toEqual(b)
  })
})

describe('generarTestTema', () => {
  it('respeta unidades y cantidad', () => {
    const t = generarTestTema(preguntas, { unidades: [5, 6], cantidad: 10 }, rngFijo(3))
    expect(t).toHaveLength(10)
    expect(t.every((p) => p.unidad === 5 || p.unidad === 6)).toBe(true)
  })

  it('«todas» devuelve todas las de la unidad', () => {
    const n = preguntas.filter((p) => p.unidad === 2 && !p.requiereImagen).length
    expect(generarTestTema(preguntas, { unidades: [2], cantidad: 'todas' })).toHaveLength(n)
  })

  it('si se piden más de las que hay, devuelve las que hay', () => {
    const n = preguntas.filter((p) => p.unidad === 7).length
    expect(generarTestTema(preguntas, { unidades: [7], cantidad: 500 })).toHaveLength(n)
  })

  it('puede excluir las preguntas que requieren la carta', () => {
    const t = generarTestTema(preguntas, { unidades: [10, 11], cantidad: 'todas', excluirCarta: true })
    expect(t.some((p) => p.requiereCarta)).toBe(false)
    expect(t.length).toBeGreaterThan(0)
  })
})
