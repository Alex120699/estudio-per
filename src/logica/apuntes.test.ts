import { describe, expect, it } from 'vitest'
import { apunteDe, markdownApuntes } from '../datos/apuntes'
import { programa } from '../tipos/programa'
import { procesarApunte } from './apuntes'

describe('procesarApunte', () => {
  const md = '# UT 9 · Prueba\n\n## 9.1 Uno\n\nTexto **fuerte**.\n\n### Detalle\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n## 9.2 Dos\n\n> truco\n'
  const a = procesarApunte(9, md)

  it('saca el título y las secciones con su código', () => {
    expect(a.titulo).toBe('UT 9 · Prueba')
    expect(a.secciones).toEqual([
      { codigo: '9.1', titulo: 'Uno', id: 'ap-9-1' },
      { codigo: '9.2', titulo: 'Dos', id: 'ap-9-2' },
    ])
  })

  it('pone ids a los encabezados y no repite el h1', () => {
    expect(a.html).toContain('<h2 id="ap-9-1">9.1 Uno</h2>')
    expect(a.html).toContain('<h3 id="ap-detalle">Detalle</h3>')
    expect(a.html).not.toContain('<h1')
  })

  it('envuelve las tablas para que se desplacen en el móvil', () => {
    expect(a.html).toMatch(/<div class="tabla-scroll"><table><thead><tr><th>a<\/th><th>b<\/th><\/tr><\/thead><tbody><tr><td>1<\/td><td>2<\/td><\/tr>/)
  })
})

describe('apuntes del repositorio', () => {
  it('hay un apunte por cada unidad del programa', () => {
    expect([...markdownApuntes.keys()].sort((a, b) => a - b)).toEqual(programa.unidades.map((u) => u.numero))
  })

  for (const u of programa.unidades) {
    it(`UT ${u.numero}: sigue el índice del programa oficial`, () => {
      const a = apunteDe(u.numero)!
      expect([`UT ${u.numero} · ${u.nombre}`, `UT ${u.numero} · ${u.nombreCuadro}`]).toContain(a.titulo)
      expect(a.secciones.map((s) => `${s.codigo} ${s.titulo}`)).toEqual(u.apartados.map((ap) => `${ap.codigo} ${ap.titulo}`))
    })
  }

  it('no llevan HTML incrustado (todo es Markdown)', () => {
    for (const md of markdownApuntes.values()) expect(md).not.toMatch(/<[a-z][^>]*>/i)
  })
})
