import { describe, expect, it } from 'vitest'
import { programa } from '../tipos/programa'
import { corregirSimulacro, type RespuestaCorregible } from './correccion'

/**
 * Construye las respuestas de un simulacro con el reparto oficial.
 * `fallos[ut]` = preguntas falladas en esa unidad; `blancos[ut]` = sin responder.
 */
function simulacro(
  tipo: 'completo' | 'complementario',
  fallos: Record<number, number> = {},
  blancos: Record<number, number> = {},
): RespuestaCorregible[] {
  const unidades = tipo === 'completo' ? programa.unidades : programa.unidades.filter((u) => u.numero >= 7)
  return unidades.flatMap((u) =>
    Array.from({ length: u.preguntas }, (_, i) => {
      const f = fallos[u.numero] ?? 0
      const b = blancos[u.numero] ?? 0
      if (i < b) return { unidad: u.numero, respondida: false, acierto: false }
      if (i < b + f) return { unidad: u.numero, respondida: true, acierto: false }
      return { unidad: u.numero, respondida: true, acierto: true }
    }),
  )
}

describe('simulacro completo (45 preguntas)', () => {
  it('todo bien: apto', () => {
    const r = corregirSimulacro(programa, 'completo', simulacro('completo'))
    expect(r).toMatchObject({ preguntas: 45, aciertos: 45, apto: true, motivos: [], aptoPNB: true })
  })

  it('aprobado justo con 32 aciertos (13 errores sin pasar límites por materia)', () => {
    // 2 Balizamiento + 5 RIPA + 2 Carta + 4 repartidos en unidades sin límite = 13 errores
    const r = corregirSimulacro(programa, 'completo', simulacro('completo', { 5: 2, 6: 5, 11: 2, 1: 1, 3: 1, 9: 1, 10: 1 }))
    expect(r.aciertos).toBe(32)
    expect(r.apto).toBe(true)
  })

  it('suspenso con 31 aciertos por nota global', () => {
    const r = corregirSimulacro(programa, 'completo', simulacro('completo', { 1: 4, 3: 4, 9: 4, 10: 2 }))
    expect(r.aciertos).toBe(31)
    expect(r.apto).toBe(false)
    expect(r.motivos).toHaveLength(1)
    expect(r.motivos[0]).toMatch(/^Nota global/)
  })

  it('suspenso con 6 errores en RIPA aunque haya 39 aciertos', () => {
    const r = corregirSimulacro(programa, 'completo', simulacro('completo', { 6: 6 }))
    expect(r.aciertos).toBe(39)
    expect(r.apto).toBe(false)
    expect(r.motivos).toEqual(['Reglamento (RIPA): 6 errores; el máximo permitido es 5.'])
  })

  it('suspenso con 3 errores en Balizamiento', () => {
    const r = corregirSimulacro(programa, 'completo', simulacro('completo', { 5: 3 }))
    expect(r.apto).toBe(false)
    expect(r.motivos[0]).toMatch(/^Balizamiento: 3 errores/)
  })

  it('suspenso con 3 errores en Carta de navegación', () => {
    const r = corregirSimulacro(programa, 'completo', simulacro('completo', { 11: 3 }))
    expect(r.apto).toBe(false)
    expect(r.porUnidad.find((u) => u.unidad === 11)).toMatchObject({ errores: 3, superaLimite: true })
  })

  it('las preguntas en blanco cuentan como errores de su materia', () => {
    const r = corregirSimulacro(programa, 'completo', simulacro('completo', { 5: 1 }, { 5: 2 }))
    expect(r.enBlanco).toBe(2)
    expect(r.porUnidad.find((u) => u.unidad === 5)).toMatchObject({ aciertos: 2, errores: 3, enBlanco: 2, superaLimite: true })
    expect(r.apto).toBe(false)
  })

  it('puede suspender a la vez por nota global y por materia', () => {
    const r = corregirSimulacro(programa, 'completo', simulacro('completo', { 6: 10, 3: 4 }))
    expect(r.motivos).toHaveLength(2)
  })

  it('equivalencia PNB: suspende el PER pero cumple las exigencias del PNB', () => {
    // UT 7-11 todo mal (18 errores) → 27 aciertos < 32, pero UT 1-6 perfectas.
    const r = corregirSimulacro(programa, 'completo', simulacro('completo', { 7: 2, 8: 3, 9: 4, 10: 5, 11: 4 }))
    expect(r.apto).toBe(false)
    expect(r.aptoPNB).toBe(true)
  })

  it('equivalencia PNB: no se alcanza con 6 errores en RIPA', () => {
    const r = corregirSimulacro(programa, 'completo', simulacro('completo', { 6: 6 }))
    expect(r.aptoPNB).toBe(false)
  })

  it('equivalencia PNB: no se alcanza con 16 aciertos en UT 1-6', () => {
    const r = corregirSimulacro(programa, 'completo', simulacro('completo', { 1: 4, 2: 2, 3: 4, 4: 1 }))
    expect(r.aptoPNB).toBe(false)
  })
})

describe('simulacro complementario PNB (18 preguntas, UT 7-11)', () => {
  it('aprobado justo con 15 aciertos', () => {
    const r = corregirSimulacro(programa, 'complementario', simulacro('complementario', { 9: 1, 10: 1, 11: 1 }))
    expect(r).toMatchObject({ preguntas: 18, aciertos: 15, apto: true })
    expect(r.aptoPNB).toBeUndefined()
  })

  it('suspenso con 14 aciertos', () => {
    const r = corregirSimulacro(programa, 'complementario', simulacro('complementario', { 8: 2, 9: 2 }))
    expect(r.aciertos).toBe(14)
    expect(r.apto).toBe(false)
  })

  it('suspenso con 3 errores en Carta aunque haya 15 aciertos', () => {
    const r = corregirSimulacro(programa, 'complementario', simulacro('complementario', { 11: 3 }))
    expect(r.aciertos).toBe(15)
    expect(r.apto).toBe(false)
    expect(r.motivos[0]).toMatch(/^Carta de navegación: 3 errores/)
  })

  it('solo corrige las unidades 7 a 11', () => {
    const r = corregirSimulacro(programa, 'complementario', simulacro('complementario'))
    expect(r.porUnidad.map((u) => u.unidad)).toEqual([7, 8, 9, 10, 11])
  })
})
