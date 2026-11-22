import { describe, expect, it } from 'vitest'
import { preguntas } from '../tipos/preguntas'
import { programa } from '../tipos/programa'
import { explicacionDe, idsConExplicacion } from './explicaciones'

describe('explicaciones.json', () => {
  const porId = new Map(preguntas.map((p) => [p.id, p]))

  it('cada explicación corresponde a una pregunta del banco', () => {
    for (const id of idsConExplicacion()) expect(porId.has(id), id).toBe(true)
  })

  it('el apartado existe en la unidad de la pregunta y el texto no está vacío', () => {
    for (const id of idsConExplicacion()) {
      const e = explicacionDe(id)!
      const u = programa.unidades.find((x) => x.numero === porId.get(id)!.unidad)!
      expect(u.apartados.map((a) => a.codigo), id).toContain(e.apartado)
      expect(e.texto.length, id).toBeGreaterThan(30)
      expect(e.texto, id).not.toMatch(/<[a-z]/i)
    }
  })

  it('los motivos por opción cuadran con las opciones (correcta vacía, el resto con texto)', () => {
    for (const id of idsConExplicacion()) {
      const o = explicacionDe(id)!.opciones
      if (!o) continue
      const p = porId.get(id)!
      expect(o.length, id).toBe(p.opciones.length)
      o.forEach((m, k) => {
        if (k === p.correcta) expect(m, id).toBe('')
        else {
          expect(m.length, `${id} opción ${k}`).toBeGreaterThan(10)
          expect(m, id).not.toMatch(/<[a-z]/i)
        }
      })
    }
  })

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])('la UT %i está completa', (unidad) => {
    const lista = preguntas.filter((p) => p.unidad === unidad)
    expect(lista.filter((p) => !explicacionDe(p.id)).map((p) => p.id)).toEqual([])
  })
})
