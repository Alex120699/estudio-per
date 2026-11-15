import { describe, expect, it } from 'vitest'
import { claveDedup, normalizar, parsearAndalucia, parsearBaleares, separarEtiquetas, validarExamen } from './parsers.mjs'

const ANDALUCIA = `
     EXAMEN PARA LA OBTENCIÓN DEL TÍTULO DE PATRÓN DE
                          EMBARCACIONES DE RECREO

                      UNIDAD TEÓRICA 1. NOMENCLATURA NÁUTICA

1. Cuando un ancla «cuelga sobre freno» del costado próxima al agua y lista para ser
    fondeada, decimos que el ancla está:
    a) A pique
    b) A la pendura
    c) Clara
    d) Libre

                              UNIDAD TEÓRICA 5. BALIZAMIENTO
  (Las preguntas sobre marcas laterales se refieren a la Región de Balizamiento A)

2. Una embarcación exhibe la bandera de la figura. Se trata de:
    a) Opción uno
    b) Opción dos que sigue
        en otra línea                                             Blanco  Azul
    c) Opción tres
    d) Opción cuatro
`

const BALEARES = `Examen: Prova teòrica PER RD 875/2014
Convocatòria: SETEMBRE 2026

SECCIÓ: Mòdul PNB

1. La dirección perpendicular al costado de un buque es:
A: El través
B: La línea de crujía
C: Las amuras
D: Las aletas

Resposta correcta: A

2. Un velero navegando de noche podrá exhibir:
A: Luces de costado
B: Dos luces todo horizonte
C: Dos luces todo horizonte
D: Ninguna

Respostes correctes: B i C

                                                                    8-9
3. Pregunta de varias
líneas
A: uno.
B: dos.
C: tres.
D: cuatro.
Resposta correcta: D
`

describe('parsearAndalucia', () => {
  const { preguntas, ignoradas } = parsearAndalucia(ANDALUCIA)

  it('lee preguntas, opciones multilínea y unidad de la cabecera', () => {
    expect(preguntas).toHaveLength(2)
    expect(preguntas[0]).toMatchObject({
      numero: 1,
      unidad: 1,
      enunciado: 'Cuando un ancla «cuelga sobre freno» del costado próxima al agua y lista para ser fondeada, decimos que el ancla está:',
      opciones: ['A pique', 'A la pendura', 'Clara', 'Libre'],
      correcta: null,
    })
    expect(preguntas[1].unidad).toBe(5)
  })

  it('separa las etiquetas de figura y no las mete en la opción', () => {
    expect(preguntas[1].opciones[1]).toBe('Opción dos que sigue en otra línea')
    expect(preguntas[1].etiquetas).toEqual(['Blanco  Azul'])
  })

  it('ignora la nota entre paréntesis tras la cabecera', () => {
    expect(ignoradas.some((l) => l.startsWith('(Las preguntas'))).toBe(true)
  })
})

describe('parsearBaleares', () => {
  const { preguntas } = parsearBaleares(BALEARES, [[1, 2], [2, 1]])

  it('lee la respuesta correcta incluida y asigna la unidad por posición', () => {
    expect(preguntas).toHaveLength(3)
    expect(preguntas[0]).toMatchObject({ unidad: 1, correcta: 0, opciones: ['El través', 'La línea de crujía', 'Las amuras', 'Las aletas'] })
    expect(preguntas[2]).toMatchObject({ unidad: 2, correcta: 3, enunciado: 'Pregunta de varias líneas' })
  })

  it('marca para excluir las preguntas con varias respuestas correctas', () => {
    expect(preguntas[1].excluir).toMatch(/B i C/)
  })

  it('no mete el número de página en las opciones', () => {
    expect(preguntas[1].opciones[3]).toBe('Ninguna')
  })
})

describe('separarEtiquetas', () => {
  it('corta solo con huecos grandes', () => {
    expect(separarEtiquetas('texto normal  con dos espacios')).toEqual({ texto: 'texto normal  con dos espacios', etiqueta: null })
    expect(separarEtiquetas('    b) texto       Azul').etiqueta).toBe('Azul')
  })
})

describe('deduplicado', () => {
  it('reconoce la misma pregunta con las opciones en otro orden y otra tipografía', () => {
    const a = { enunciado: '¿Qué es el través?', opciones: ['Uno', 'Dos', 'Tres', '–9º'] }
    const b = { enunciado: '¿Que es el  traves?', opciones: ['-9°', 'tres', 'Uno', 'Dos'] }
    expect(claveDedup(a)).toBe(claveDedup(b))
    expect(normalizar('Ángulo –9º')).toBe('angulo -9o')
  })
})

describe('validarExamen', () => {
  const reparto = [[1, 1], [2, 1]]
  const ok = (numero, unidad) => ({ numero, unidad, enunciado: 'x', opciones: ['a', 'b', 'c', 'd'], correcta: 0 })

  it('acepta un examen correcto', () => {
    expect(validarExamen([ok(1, 1), ok(2, 2)], reparto)).toEqual([])
  })

  it('detecta reparto, opciones y respuestas incorrectas', () => {
    const errs = validarExamen([ok(1, 1), { ...ok(2, 1), opciones: ['a', 'b', 'c'], correcta: null }], reparto)
    expect(errs).toContain('pregunta 2: 3 opciones')
    expect(errs).toContain('pregunta 2: sin respuesta correcta')
    expect(errs).toContain('UT2: 0 preguntas (esperadas 1)')
  })
})
