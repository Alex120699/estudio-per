import { describe, expect, it } from 'vitest'
import { preguntas } from '../tipos/preguntas'
import { idsConResolucion, resolucionDe } from './resoluciones'

describe('resoluciones.json', () => {
  const porId = new Map(preguntas.map((p) => [p.id, p]))

  it('cada resolución es de una pregunta de carta del banco', () => {
    for (const id of idsConResolucion()) {
      expect(porId.has(id), id).toBe(true)
      expect(porId.get(id)!.unidad, id).toBe(11)
    }
  })

  it('todas se resuelven sin errores y terminan con un resultado', () => {
    for (const id of idsConResolucion()) {
      const r = resolucionDe(id)!
      expect(r.error, id).toBeUndefined()
      expect(r.lineas.at(-1)?.final, id).toBe(true)
      for (const l of r.lineas) expect(l.texto, id).not.toMatch(/NaN|undefined|\{|\b[Dd]e S\b/)
    }
  })
})
