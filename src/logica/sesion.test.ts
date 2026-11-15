import { describe, expect, it } from 'vitest'
import type { Pregunta } from '../tipos/preguntas'
import { programa } from '../tipos/programa'
import { irA, nuevaSesion, preguntasDe, responder, resumir, terminar } from './sesion'

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
