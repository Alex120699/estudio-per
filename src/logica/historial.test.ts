import { describe, expect, it } from 'vitest'
import type { Pregunta } from '../tipos/preguntas'
import {
  aplicarACaja,
  calcularCaja,
  crearExportacion,
  diaLocal,
  estadisticasPorPregunta,
  estadisticasPorUnidad,
  estoyListo,
  fusionar,
  pendientesHoy,
  semanaDe,
  validarExportacion,
  type RegistroRespuesta,
  type RegistroSesion,
} from './historial'

// Fechas en hora local para que «día distinto» no dependa de la zona horaria del equipo.
const f = (dia: string, hora = '10:00') => new Date(`${dia}T${hora}:00`).toISOString()
const r = (preguntaId: string, acierto: boolean, fecha: string, sesionId = 's1'): RegistroRespuesta => ({
  preguntaId,
  acierto,
  fecha,
  elegida: acierto ? 0 : 1,
  modo: 'estudio',
  sesionId,
})

describe('caja de fallos', () => {
  it('un fallo mete la pregunta en la caja', () => {
    expect(aplicarACaja(undefined, r('p', false, f('2026-11-01')))).toMatchObject({ aciertosSeguidos: 0, ultimoAcierto: null })
  })

  it('un acierto de una pregunta fuera de la caja no cambia nada', () => {
    expect(aplicarACaja(undefined, r('p', true, f('2026-11-01')))).toBeUndefined()
  })

  it('sale tras 2 aciertos seguidos en días distintos', () => {
    const caja = calcularCaja([r('p', false, f('2026-11-01')), r('p', true, f('2026-11-02')), r('p', true, f('2026-11-03'))])
    expect(caja.has('p')).toBe(false)
  })

  it('2 aciertos el mismo día solo cuentan como 1', () => {
    const caja = calcularCaja([r('p', false, f('2026-11-01')), r('p', true, f('2026-11-02', '09:00')), r('p', true, f('2026-11-02', '20:00'))])
    expect(caja.get('p')).toMatchObject({ aciertosSeguidos: 1, ultimoAcierto: '2026-11-02' })
  })

  it('un fallo intermedio reinicia el contador', () => {
    const caja = calcularCaja([
      r('p', false, f('2026-11-01')),
      r('p', true, f('2026-11-02')),
      r('p', false, f('2026-11-03')),
      r('p', true, f('2026-11-04')),
    ])
    expect(caja.get('p')).toMatchObject({ aciertosSeguidos: 1 })
  })

  it('el mismo día del fallo, acertar después sí cuenta (es el primer acierto)', () => {
    const caja = calcularCaja([r('p', false, f('2026-11-01', '09:00')), r('p', true, f('2026-11-01', '10:00'))])
    expect(caja.get('p')).toMatchObject({ aciertosSeguidos: 1, ultimoAcierto: '2026-11-01' })
  })

  it('calcularCaja ordena por fecha aunque el historial venga desordenado', () => {
    const caja = calcularCaja([r('p', true, f('2026-11-03')), r('p', false, f('2026-11-01')), r('p', true, f('2026-11-02'))])
    expect(caja.has('p')).toBe(false)
  })

  it('pendientesHoy excluye las ya acertadas hoy', () => {
    const caja = calcularCaja([r('a', false, f('2026-11-01')), r('b', false, f('2026-11-01')), r('b', true, f('2026-11-05'))])
    expect(pendientesHoy(caja.values(), '2026-11-05').map((e) => e.preguntaId)).toEqual(['a'])
  })
})

describe('estadísticas', () => {
  const banco = [
    { id: 'a', unidad: 1 },
    { id: 'b', unidad: 1 },
    { id: 'c', unidad: 2 },
  ] as Pregunta[]
  const hist = [r('a', true, f('2026-11-02')), r('a', false, f('2026-11-03')), r('c', true, f('2026-11-10'))]

  it('por pregunta: vistas, aciertos, fallos y última respuesta', () => {
    expect(estadisticasPorPregunta(hist).get('a')).toMatchObject({ vista: 2, aciertos: 1, fallos: 1, ultimoAcierto: false, ultimaElegida: 1 })
  })

  it('por unidad: porcentaje, cobertura, caja y evolución semanal', () => {
    const [u1, u2] = estadisticasPorUnidad([1, 2], banco, hist, calcularCaja(hist))
    expect(u1).toMatchObject({ enBanco: 2, vistas: 1, respuestas: 2, aciertos: 1, porcentaje: 50, enCaja: 1 })
    expect(u2).toMatchObject({ porcentaje: 100, enCaja: 0 })
    // 2 y 3 de noviembre de 2026 son lunes y martes de la misma semana.
    expect(u1.evolucion).toEqual([{ semana: '2026-11-02', porcentaje: 50, respuestas: 2 }])
  })

  it('semanaDe devuelve el lunes', () => {
    expect(semanaDe(f('2026-11-08'))).toBe('2026-11-02') // domingo → lunes anterior
    expect(diaLocal(f('2026-11-08'))).toBe('2026-11-08')
  })
})

const sesion = (id: string, fin: string, apto: boolean, simulacro: 'completo' | 'complementario' = 'completo'): RegistroSesion => ({
  id,
  tipo: 'simulacro',
  simulacro,
  modo: 'test',
  inicio: fin,
  fin,
  preguntaIds: [],
  respuestas: [],
  resultado: { preguntas: 45, aciertos: apto ? 40 : 20, enBlanco: 0, apto },
})

describe('¿Estoy listo?', () => {
  it('usa solo los 5 últimos simulacros del tipo pedido', () => {
    const ss = [
      sesion('1', f('2026-11-01'), false),
      sesion('2', f('2026-11-02'), true),
      sesion('3', f('2026-11-03'), true),
      sesion('4', f('2026-11-04'), false),
      sesion('5', f('2026-11-05'), true),
      sesion('6', f('2026-11-06'), true),
      sesion('c', f('2026-11-07'), false, 'complementario'),
    ]
    expect(estoyListo(ss)).toEqual({ considerados: 5, aprobados: 4, porcentaje: 80 })
    expect(estoyListo(ss, 'complementario')).toEqual({ considerados: 1, aprobados: 0, porcentaje: 0 })
  })

  it('sin simulacros: porcentaje null', () => {
    expect(estoyListo([])).toEqual({ considerados: 0, aprobados: 0, porcentaje: null })
  })
})

describe('exportar / importar', () => {
  const hist = [{ ...r('a', true, f('2026-11-02')), id: 7 }]
  const ses = [sesion('s1', f('2026-11-02'), true)]

  it('la exportación no incluye ids internos y se puede validar', () => {
    const e = crearExportacion(hist, ses)
    expect(e.respuestas[0]).not.toHaveProperty('id')
    expect(validarExportacion(JSON.parse(JSON.stringify(e)))).toEqual(e)
  })

  it('rechaza ficheros que no son copias de la app', () => {
    expect(() => validarExportacion({ foo: 1 })).toThrow(/no es una copia/)
    expect(() => validarExportacion({ app: 'estudio-per', version: 99, respuestas: [], sesiones: [] })).toThrow(/más nueva/)
    expect(() => validarExportacion({ app: 'estudio-per', version: 1, respuestas: [{ x: 1 }], sesiones: [] })).toThrow(/respuestas/)
  })

  it('importar dos veces la misma copia no duplica nada', () => {
    const e = crearExportacion(hist, ses)
    expect(fusionar({ respuestas: hist, sesiones: ses }, e)).toEqual({ respuestasNuevas: [], sesionesNuevas: [] })
    const nueva = crearExportacion([...hist, r('b', false, f('2026-11-03'), 's2')], [...ses, sesion('s2', f('2026-11-03'), false)])
    const res = fusionar({ respuestas: hist, sesiones: ses }, nueva)
    expect(res.respuestasNuevas.map((x) => x.preguntaId)).toEqual(['b'])
    expect(res.sesionesNuevas.map((x) => x.id)).toEqual(['s2'])
  })
})
