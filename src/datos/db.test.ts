import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import type { RegistroRespuesta, RegistroSesion } from '../logica/historial'
import { BaseDatos, borrarTodo, exportar, guardarSesion, importar, leerHistorial, registrarRespuestas } from './db'

const f = (dia: string) => new Date(`${dia}T10:00:00`).toISOString()
const r = (preguntaId: string, acierto: boolean, dia: string, sesionId = 's1'): RegistroRespuesta => ({
  preguntaId,
  acierto,
  fecha: f(dia),
  elegida: acierto ? 0 : 1,
  modo: 'test',
  sesionId,
})
const ses = (id: string): RegistroSesion => ({
  id,
  tipo: 'tema',
  modo: 'test',
  inicio: f('2026-11-01'),
  fin: f('2026-11-01'),
  preguntaIds: ['a'],
  respuestas: [0],
  resultado: { preguntas: 1, aciertos: 1, enBlanco: 0 },
})

let n = 0
const nueva = () => new BaseDatos(`test-${++n}`)
const abiertas: BaseDatos[] = []
afterEach(async () => {
  for (const b of abiertas.splice(0)) await b.delete()
})
const base = () => {
  const b = nueva()
  abiertas.push(b)
  return b
}

describe('db', () => {
  it('registra respuestas y mantiene la caja de fallos', async () => {
    const b = base()
    await registrarRespuestas([r('a', false, '2026-11-01'), r('b', true, '2026-11-01')], b)
    let h = await leerHistorial(b)
    expect(h.respuestas).toHaveLength(2)
    expect([...h.caja.keys()]).toEqual(['a'])

    await registrarRespuestas([r('a', true, '2026-11-02')], b)
    await registrarRespuestas([r('a', true, '2026-11-03')], b)
    h = await leerHistorial(b)
    expect(h.caja.size).toBe(0)
  })

  it('exportar → importar en otra base reproduce historial y caja', async () => {
    const origen = base()
    await registrarRespuestas([r('a', false, '2026-11-01'), r('b', false, '2026-11-01'), r('b', true, '2026-11-02')], origen)
    await guardarSesion(ses('s1'), origen)
    const copia = JSON.parse(JSON.stringify(await exportar(origen)))

    const destino = base()
    expect(await importar(copia, destino)).toEqual({ respuestas: 3, sesiones: 1 })
    const h = await leerHistorial(destino)
    expect(h.respuestas).toHaveLength(3)
    expect(h.sesiones.map((s) => s.id)).toEqual(['s1'])
    expect(h.caja.get('b')).toMatchObject({ aciertosSeguidos: 1 })
    expect(h.caja.has('a')).toBe(true)

    // Importar de nuevo no duplica.
    expect(await importar(copia, destino)).toEqual({ respuestas: 0, sesiones: 0 })
  })

  it('importar fusiona con el historial existente y recalcula la caja', async () => {
    const b = base()
    await registrarRespuestas([r('a', false, '2026-11-01', 'local')], b)
    // Copia de otro dispositivo con dos aciertos posteriores de «a» en días distintos.
    const otra = base()
    await registrarRespuestas([r('a', true, '2026-11-02', 'movil'), r('a', true, '2026-11-03', 'movil')], otra)
    await importar(JSON.parse(JSON.stringify(await exportar(otra))), b)
    const h = await leerHistorial(b)
    expect(h.respuestas).toHaveLength(3)
    expect(h.caja.has('a')).toBe(false)
  })

  it('una copia no válida no toca nada', async () => {
    const b = base()
    await registrarRespuestas([r('a', false, '2026-11-01')], b)
    await expect(importar({ app: 'otra' }, b)).rejects.toThrow()
    expect((await leerHistorial(b)).respuestas).toHaveLength(1)
  })

  it('borrarTodo vacía las tres tablas', async () => {
    const b = base()
    await registrarRespuestas([r('a', false, '2026-11-01')], b)
    await guardarSesion(ses('s1'), b)
    await borrarTodo(b)
    const h = await leerHistorial(b)
    expect([h.respuestas.length, h.sesiones.length, h.caja.size]).toEqual([0, 0, 0])
  })
})
