import { describe, expect, it } from 'vitest'
import { programa } from './programa'

const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

describe('programa.json (Anexo II RD 875/2014)', () => {
  const { unidades, examen } = programa

  it('tiene las 11 unidades en orden', () => {
    expect(unidades.map((u) => u.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    for (const u of unidades) expect(u.apartados.length).toBeGreaterThan(0)
  })

  it('reparte 45 preguntas como el cuadro oficial', () => {
    expect(Object.fromEntries(unidades.map((u) => [u.numero, u.preguntas]))).toEqual({
      1: 4, 2: 2, 3: 4, 4: 2, 5: 5, 6: 10, 7: 2, 8: 3, 9: 4, 10: 5, 11: 4,
    })
    expect(suma(unidades.map((u) => u.preguntas))).toBe(examen.completo.preguntas)
    expect(examen.completo.preguntas).toBe(45)
  })

  it('PNB = UT 1–6 (27) y complementario = UT 7–11 (18)', () => {
    const pnb = unidades.filter((u) => u.bloque === 'PNB')
    expect(pnb.map((u) => u.numero)).toEqual([1, 2, 3, 4, 5, 6])
    expect(suma(pnb.map((u) => u.preguntas))).toBe(27)
    expect(examen.complementarioPNB.unidades).toEqual([7, 8, 9, 10, 11])
    expect(examen.complementarioPNB.preguntas).toBe(18)
  })

  it('criterios de aprobado del examen completo', () => {
    expect(examen.completo.minAciertos).toBe(32)
    expect(examen.completo.maxErroresPorUnidad).toEqual({ 5: 2, 6: 5, 11: 2 })
  })

  it('criterios del examen complementario', () => {
    expect(examen.complementarioPNB.minAciertos).toBe(15)
    expect(examen.complementarioPNB.maxErroresTotales).toBe(3)
    expect(examen.complementarioPNB.maxErroresPorUnidad).toEqual({ 11: 2 })
  })

  it('máximo de errores y mínimo de aciertos son coherentes por unidad', () => {
    for (const u of unidades) {
      if (u.maxErrores !== null) expect(u.preguntas - u.maxErrores).toBe(u.minAciertos)
    }
  })
})
