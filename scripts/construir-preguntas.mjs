// Construye data/preguntas.json a partir de los textos de fuentes/txt/ y las
// soluciones de fuentes/soluciones/ (o las incluidas en el propio examen).
//
// Pasos: parsear → aplicar plantilla y correcciones oficiales → validar cada examen
// → deduplicar entre convocatorias (comprobando que la respuesta coincide) → escribir.
//
// Uso: node scripts/construir-preguntas.mjs

import { readFile, writeFile } from 'node:fs/promises'
import { parsearAndalucia, parsearBaleares, validarExamen, claveDedup, normalizar, pideImagen } from './lib/parsers.mjs'

const programa = JSON.parse(await readFile('data/programa.json', 'utf8'))
const reparto = programa.unidades.map((u) => [u.numero, u.preguntas])
const { examenes } = JSON.parse(await readFile('scripts/fuentes.json', 'utf8'))

const errores = []
const banco = new Map() // clave → pregunta
const excluidas = []
let totalLeidas = 0

for (const ex of examenes) {
  const texto = await readFile(`fuentes/txt/${ex.id}.txt`, 'utf8')
  const { preguntas } = ex.formato === 'andalucia' ? parsearAndalucia(texto) : parsearBaleares(texto, reparto)

  if (ex.formato === 'andalucia') {
    const sol = JSON.parse(await readFile(`fuentes/soluciones/${ex.id}.json`, 'utf8'))
    for (const p of preguntas) {
      const letra = sol.respuestas[String(p.numero)]
      p.correcta = letra ? 'abcd'.indexOf(letra) : null
    }
  }
  for (const [num, corr] of Object.entries(ex.correcciones ?? {})) {
    const p = preguntas.find((x) => x.numero === Number(num))
    if (!p) errores.push(`${ex.id}: corrección para la pregunta ${num}, que no existe`)
    else {
      p.correcta = 'abcd'.indexOf(corr.correcta)
      p.correccion = corr.motivo
    }
  }

  const figuras = new Set(JSON.parse(await readFile(`fuentes/figuras/${ex.id}.json`, 'utf8')).preguntas)
  for (const p of preguntas) {
    p.requiereImagen = figuras.has(p.numero) || p.etiquetas.length > 0 || pideImagen(p.enunciado)
  }

  const errs = validarExamen(preguntas, reparto)
  if (errs.length) {
    errores.push(...errs.map((e) => `${ex.id}: ${e}`))
    continue
  }
  totalLeidas += preguntas.length

  for (const p of preguntas) {
    if (p.excluir) {
      excluidas.push(`${ex.id}-${p.numero}: ${p.excluir}`)
      continue
    }
    const fuente = {
      comunidad: ex.comunidad,
      convocatoria: ex.convocatoria,
      modelo: ex.modelo,
      numero: p.numero,
      url: ex.examen,
      ...(ex.plantilla && { plantilla: ex.plantilla }),
      ...(p.correccion && { correccion: p.correccion }),
    }
    const clave = claveDedup(p)
    const existente = banco.get(clave)
    if (existente) {
      // Misma pregunta en otra convocatoria/modelo: la respuesta debe coincidir (por texto, el orden puede variar).
      const correctaTexto = normalizar(p.opciones[p.correcta])
      const yaTexto = normalizar(existente.opciones[existente.correcta])
      if (correctaTexto !== yaTexto) {
        errores.push(
          `Respuesta discrepante para «${p.enunciado.slice(0, 60)}…»: ${existente.id} dice «${existente.opciones[existente.correcta]}», ${ex.id}-${p.numero} dice «${p.opciones[p.correcta]}»`,
        )
      }
      if (existente.unidad !== p.unidad) errores.push(`${existente.id}: unidad ${existente.unidad} vs ${p.unidad} en ${ex.id}-${p.numero}`)
      existente.fuentes.push(fuente)
      continue
    }
    banco.set(clave, {
      id: `${ex.id}-${p.numero}`,
      unidad: p.unidad,
      enunciado: p.enunciado,
      opciones: p.opciones,
      correcta: p.correcta,
      requiereCarta: p.unidad === 11,
      ...(p.requiereImagen && { requiereImagen: true }),
      fuentes: [fuente],
    })
  }
}

if (errores.length) {
  console.error('ERRORES:\n' + errores.join('\n'))
  process.exit(1)
}

const preguntas = [...banco.values()].sort((a, b) => a.unidad - b.unidad || a.id.localeCompare(b.id))
await writeFile('data/preguntas.json', JSON.stringify(preguntas, null, 2) + '\n', 'utf8')

const porUnidad = Object.fromEntries(programa.unidades.map((u) => [u.numero, preguntas.filter((p) => p.unidad === u.numero).length]))
console.log(`Leídas ${totalLeidas} preguntas de ${examenes.length} exámenes → ${preguntas.length} únicas`)
console.log('Por unidad:', porUnidad)
console.log(`Repetidas en varias fuentes: ${preguntas.filter((p) => p.fuentes.length > 1).length}`)
console.log(`Con imagen pendiente: ${preguntas.filter((p) => p.requiereImagen).map((p) => p.id).join(', ') || 'ninguna'}`)
console.log(`Excluidas: ${excluidas.join('; ') || 'ninguna'}`)
console.log(`Con corrección oficial aplicada: ${preguntas.filter((p) => p.fuentes.some((f) => f.correccion)).map((p) => p.id).join(', ') || 'ninguna'}`)
