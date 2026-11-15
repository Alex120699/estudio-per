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

  it('la UT 2 está completa (piloto)', () => {
    const ut2 = preguntas.filter((p) => p.unidad === 2)
    expect(ut2.filter((p) => !explicacionDe(p.id)).map((p) => p.id)).toEqual([])
  })
})
