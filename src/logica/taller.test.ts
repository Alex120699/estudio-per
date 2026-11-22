import { describe, expect, it } from 'vitest'
import faros from '../../data/faros.json'
import { azarFijo, esCorrecta, leerCoordenada, leerHora, leerRespuesta, lecciones, type PuntoCarta } from './taller'

const L = lecciones((faros as { puntos: Record<string, PuntoCarta> }).puntos)

describe('taller de carta', () => {
  it('lee respuestas con signo, coma y NE/NW', () => {
    expect(leerRespuesta('-3')).toBe(-3)
    expect(leerRespuesta('−3,5')).toBe(-3.5)
    expect(leerRespuesta('3 NW')).toBe(-3)
    expect(leerRespuesta('3,5º NE')).toBe(3.5)
    expect(leerRespuesta('+4')).toBe(4)
    expect(leerRespuesta('045')).toBe(45)
    expect(leerRespuesta('hola')).toBeNull()
    expect(leerRespuesta('5,3 S')).toBe(-5.3)
  })

  it('lee horas y duraciones', () => {
    for (const h of ['11:45', '1145', '11h 45m', '11.45', '11 45', '11h45']) expect(leerHora(h, 'hora'), h).toBe(705)
    expect(leerHora('9:05', 'hora')).toBe(545)
    expect(leerHora('1:25', 'duracion')).toBe(85)
    expect(leerHora('85 min', 'duracion')).toBe(85)
    expect(leerHora('85', 'duracion')).toBe(85)
    expect(leerHora('2h', 'duracion')).toBe(120)
    expect(leerHora('25:10', 'hora')).toBeNull()
    expect(leerHora('11:75', 'hora')).toBeNull()
  })

  it('lee latitudes y longitudes', () => {
    expect(leerCoordenada('36 02,5', 'lat')).toBeCloseTo(36 + 2.5 / 60)
    expect(leerCoordenada("36º 02,5' N", 'lat')).toBeCloseTo(36 + 2.5 / 60)
    expect(leerCoordenada('005 41,3 W', 'lon')).toBeCloseTo(-(5 + 41.3 / 60))
    expect(leerCoordenada('5 41.3', 'lon')).toBeCloseTo(-(5 + 41.3 / 60))
    expect(leerCoordenada('5-41,3', 'lon')).toBeCloseTo(-(5 + 41.3 / 60))
    expect(leerCoordenada('36 02,5 W', 'lat')).toBeNull()
    expect(leerCoordenada('36 75', 'lat')).toBeNull()
  })

  it('compara rumbos en círculo', () => {
    const p = { pregunta: '', tipo: 'numero', clase: 'rumbo', respuesta: 359.6, margen: 0.5, pista: '', solucion: '' } as const
    expect(esCorrecta(p, 0)).toBe(true)
    expect(esCorrecta(p, 359)).toBe(false)
  })

  it('cada lección genera ejercicios válidos y la respuesta exacta se da por buena', () => {
    for (const l of L) {
      const azar = azarFijo(l.numero * 1000)
      for (let i = 0; i < 300; i++) {
        const e = l.generar(azar)
        expect(e.enunciado, l.id).not.toMatch(/NaN|undefined/)
        expect(e.pasos.length, l.id).toBeGreaterThan(0)
        for (const p of e.pasos) {
          expect(Number.isFinite(p.respuesta), `${l.id}: ${e.enunciado}`).toBe(true)
          expect(p.solucion + p.pregunta + p.pista, l.id).not.toMatch(/NaN|undefined/)
          expect(esCorrecta(p, p.respuesta), p.solucion).toBe(true)
          if (p.clase === 'rumbo') expect(p.respuesta).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('la solución escrita da por buena la respuesta redondeada', () => {
    for (const l of L) {
      const azar = azarFijo(7 + l.numero)
      for (let i = 0; i < 200; i++)
        for (const p of l.generar(azar).pasos) if (p.tipo === 'numero') {
          const r = p.clase === 'lat' || p.clase === 'lon' ? Math.round(p.respuesta * 600) / 600 : p.clase === 'hora' || p.clase === 'duracion' ? Math.round(p.respuesta) : p.margen < 0.05 ? Math.round(p.respuesta * 100) / 100 : Math.round(p.respuesta * 10) / 10
          expect(esCorrecta(p, r), p.solucion).toBe(true)
        }
    }
  })

  it('hay once lecciones con láminas que existen', () => {
    expect(L.map((l) => l.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })
})
