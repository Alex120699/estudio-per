import { describe, expect, it } from 'vitest'
import {
  aMinutos,
  conCorriente,
  contraCorriente,
  corteConRecta,
  diferencia,
  estima,
  grados,
  hora,
  latitud,
  leerCoord,
  longitud,
  porDemoraYDistancia,
  porDosDemoras,
  porDosDistancias,
  rumboAguja,
  rumboVerdadero,
  rumboYDistancia,
} from './navegacion'

const almina = { lat: 35 + 54 / 60, lon: -(5 + 16.8 / 60) }

describe('navegación', () => {
  it('rumbos y correcciones', () => {
    expect(rumboVerdadero(70, -6)).toBe(64)
    expect(rumboVerdadero(358, 5)).toBe(3)
    expect(rumboAguja(5, 8)).toBe(357)
    expect(diferencia(350, 10)).toBe(20)
    expect(diferencia(10, 350)).toBe(-20)
  })

  it('estima y su inversa', () => {
    const p = { lat: 36, lon: -6 }
    const q = estima(p, 323, 9)
    const { rumbo, distancia } = rumboYDistancia(p, q)
    expect(rumbo).toBeCloseTo(323, 6)
    expect(distancia).toBeCloseTo(9, 6)
  })

  it('situación por demora y distancia al mismo faro (examen and-2025-2-A-42)', () => {
    const s = porDemoraYDistancia(almina, 154, almina, 6)
    expect(latitud(s.lat)).toBe('35º 59,4′ N')
    expect(longitud(s.lon)).toBe('005º 20,0′ W')
  })

  it('situación por dos demoras', () => {
    const s0 = { lat: 36, lon: -5.6 }
    const a = estima(s0, 40, 5)
    const b = estima(s0, 300, 7)
    const s = porDosDemoras(a, 40, b, 300)
    expect(s.lat).toBeCloseTo(s0.lat, 4)
    expect(s.lon).toBeCloseTo(s0.lon, 4)
  })

  it('situación por dos distancias', () => {
    const s0 = { lat: 36, lon: -5.6 }
    const a = estima(s0, 90, 4)
    const b = estima(s0, 180, 3)
    const s = porDosDistancias(a, 4, b, 3, 'N')
    expect(s.lat).toBeCloseTo(s0.lat, 5)
    expect(s.lon).toBeCloseTo(s0.lon, 5)
  })

  it('corte de la derrota con una enfilación', () => {
    const p = { lat: 36, lon: -5.6 }
    const a = { lat: 36.1, lon: -5.5 }
    const b = { lat: 36.1, lon: -5.7 }
    const c = corteConRecta(p, 0, a, b)
    expect(c.lat).toBeCloseTo(36.1, 6)
    expect(c.lon).toBeCloseTo(-5.6, 6)
  })

  it('corriente: directa e inversa coinciden', () => {
    const e = conCorriente(90, 6, 0, 2)
    const s = contraCorriente(e.rumbo, 6, 0, 2)
    expect(s.rumbo).toBeCloseTo(90, 6)
    expect(s.velocidad).toBeCloseTo(e.velocidad, 6)
  })

  it('horas y formatos', () => {
    expect(aMinutos('0930')).toBe(570)
    expect(aMinutos('9h 30m')).toBe(570)
    expect(aMinutos('16:15')).toBe(975)
    expect(hora(570 + 98)).toBe('11h 08m')
    expect(hora(1440 + 5)).toBe('00h 05m')
    expect(grados(5.4)).toBe('005º')
    expect(grados(359.7)).toBe('000º')
    expect(leerCoord("36º 03,9' N")).toBeCloseTo(36.065, 6)
    expect(leerCoord('005º 18,5′ W')).toBeCloseTo(-(5 + 18.5 / 60), 6)
  })
})
