import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { preguntas } from '../tipos/preguntas'
import { markdownApuntes } from './apuntes'
import { laminasDe, preguntasConLamina, todasLasLaminas } from './laminas'

const publico = (ruta: string) => resolve(__dirname, '../../public', ruta)

describe('laminas.json', () => {
  it('cada lámina tiene título y su SVG existe', () => {
    for (const l of todasLasLaminas()) {
      expect(l.titulo.length, l.id).toBeGreaterThan(5)
      expect(existsSync(publico(l.archivo)), l.archivo).toBe(true)
      expect(readFileSync(publico(l.archivo), 'utf8'), l.archivo).toMatch(/^<svg[^>]*viewBox/)
    }
  })

  it('cada pregunta referida existe y sus láminas están definidas', () => {
    const ids = new Set(preguntas.map((p) => p.id))
    for (const [id, ls] of Object.entries(preguntasConLamina())) {
      expect(ids.has(id), id).toBe(true)
      for (const l of laminasDe(id)) expect(l.archivo, `${id} → ${ls.join(',')}`).toBeTruthy()
    }
  })

  it('las imágenes de los apuntes apuntan a archivos que existen', () => {
    for (const md of markdownApuntes.values())
      for (const m of md.matchAll(/!\[[^\]]+\]\(([^)]+)\)/g)) expect(existsSync(publico(m[1])), m[1]).toBe(true)
  })
})
