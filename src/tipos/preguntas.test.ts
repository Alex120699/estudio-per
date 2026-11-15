import { describe, expect, it } from 'vitest'
import { examenes, preguntas } from './preguntas'
import { programa } from './programa'

const imagenes = Object.keys(import.meta.glob('/public/img/*'))

describe('preguntas.json', () => {
  it('cada pregunta tiene 4 opciones distintas y una correcta', () => {
    for (const p of preguntas) {
      expect(p.opciones, p.id).toHaveLength(4)
      expect(new Set(p.opciones.map((o) => o.toLowerCase())).size, p.id).toBe(4)
      expect(p.opciones.every((o) => o.trim().length > 0), p.id).toBe(true)
      expect([0, 1, 2, 3], p.id).toContain(p.correcta)
      expect(p.enunciado.length, p.id).toBeGreaterThanOrEqual(8)
    }
  })

  it('ids únicos y unidades válidas', () => {
    expect(new Set(preguntas.map((p) => p.id)).size).toBe(preguntas.length)
    for (const p of preguntas) {
      expect(p.unidad).toBeGreaterThanOrEqual(1)
      expect(p.unidad).toBeLessThanOrEqual(11)
    }
  })

  it('todas tienen al menos una fuente oficial con URL', () => {
    for (const p of preguntas) {
      expect(p.fuentes.length, p.id).toBeGreaterThan(0)
      for (const f of p.fuentes) expect(examenes[f.examen]?.url, `${p.id} → ${f.examen}`).toMatch(/^https:\/\/www\.(juntadeandalucia|caib)\.es\//)
    }
  })

  it('hay preguntas suficientes en cada unidad para montar un simulacro', () => {
    for (const u of programa.unidades) {
      const n = preguntas.filter((p) => p.unidad === u.numero).length
      expect(n, `UT${u.numero}`).toBeGreaterThanOrEqual(u.preguntas)
    }
  })

  it('las de carta de navegación (UT 11) llevan requiereCarta', () => {
    for (const p of preguntas) expect(p.requiereCarta).toBe(p.unidad === 11)
  })

  it('no quedan restos de maquetación en los textos', () => {
    const ruido = /UNIDAD TEÓRICA|Resposta correcta|SECCIÓ|\s{3,}|^\d+-\d+$/
    for (const p of preguntas) {
      for (const t of [p.enunciado, ...p.opciones]) expect(t, p.id).not.toMatch(ruido)
    }
  })

  it('las imágenes recortadas existen', () => {
    for (const p of preguntas) {
      if (p.imagen) expect(imagenes, p.imagen).toContain(`/public/${p.imagen}`)
    }
    expect(preguntas.filter((p) => p.imagen).length).toBeGreaterThan(0)
  })
})
