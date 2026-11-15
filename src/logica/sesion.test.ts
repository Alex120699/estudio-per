import { describe, expect, it } from 'vitest'
import type { Pregunta } from '../tipos/preguntas'
import { programa } from '../tipos/programa'
import { irA, nuevaSesion, preguntasDe, registroRespuesta, registroSesion, registrosAlTerminar, responder, resumir, terminar } from './sesion'

const p = (id: string, unidad: number, correcta: number): Pregunta => ({
  id,
  unidad,
  enunciado: 'Pregunta de prueba',
  opciones: ['a', 'b', 'c', 'd'],
  correcta,
  requiereCarta: false,
  fuentes: [],
})

describe('sesión', () => {
  const banco = [p('x1', 1, 0), p('x2', 2, 1), p('x3', 3, 2)]

  it('empieza en blanco y registra respuestas sin mutar', () => {
    const s0 = nuevaSesion({ tipo: 'tema', modo: 'estudio', preguntas: banco })
    expect(s0.respuestas).toEqual([null, null, null])
    const s1 = responder(s0, 1, 3)
    expect(s1.respuestas).toEqual([null, 3, null])
    expect(s0.respuestas).toEqual([null, null, null])
  })

  it('irA se queda dentro de los límites', () => {
    const s = nuevaSesion({ tipo: 'tema', modo: 'test', preguntas: banco })
    expect(irA(s, 10).actual).toBe(2)
    expect(irA(s, -1).actual).toBe(0)
  })

  it('resume aciertos, fallos y blancos', () => {
    let s = nuevaSesion({ tipo: 'tema', modo: 'test', preguntas: banco })
    s = responder(s, 0, 0) // acierto
    s = responder(s, 1, 0) // fallo
    s = terminar(s)
    expect(s.fin).toBeTruthy()
    expect(resumir(s, banco, programa)).toEqual({ preguntas: 3, aciertos: 1, fallos: 1, enBlanco: 1 })
  })

  it('preguntasDe devuelve null si el banco ya no tiene alguna pregunta', () => {
    const s = nuevaSesion({ tipo: 'tema', modo: 'test', preguntas: banco })
    expect(preguntasDe(s, banco)).toHaveLength(3)
    expect(preguntasDe(s, banco.slice(1))).toBeNull()
  })
})

describe('paso al historial', () => {
  const banco = [p('x1', 1, 0), p('x2', 2, 1), p('x3', 6, 2)]

  it('en modo test, al terminar se registran todas; en blanco = fallo', () => {
    let s = nuevaSesion({ tipo: 'simulacro', simulacro: 'completo', modo: 'test', preguntas: banco })
    s = terminar(responder(s, 0, 0))
    const regs = registrosAlTerminar(s, banco)
    expect(regs.map((r) => [r.preguntaId, r.elegida, r.acierto])).toEqual([
      ['x1', 0, true],
      ['x2', null, false],
      ['x3', null, false],
    ])
    expect(regs.every((r) => r.sesionId === s.id && r.fecha === s.fin)).toBe(true)
  })

  it('en modo estudio no se registra nada al terminar (ya se hizo al responder)', () => {
    const s = terminar(nuevaSesion({ tipo: 'tema', modo: 'estudio', preguntas: banco }))
    expect(registrosAlTerminar(s, banco)).toEqual([])
    expect(registroRespuesta(s, banco[1], 1)).toMatchObject({ preguntaId: 'x2', elegida: 1, acierto: true, modo: 'estudio' })
  })

  it('el registro de sesión lleva el veredicto del simulacro', () => {
    const s = terminar(nuevaSesion({ tipo: 'simulacro', simulacro: 'completo', modo: 'test', preguntas: banco }))
    const reg = registroSesion(s, resumir(s, banco, programa))
    expect(reg).toMatchObject({ id: s.id, tipo: 'simulacro', simulacro: 'completo', resultado: { preguntas: 3, aciertos: 0, apto: false } })
  })
})
