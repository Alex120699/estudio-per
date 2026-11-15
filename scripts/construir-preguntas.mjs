// Construye data/preguntas.json a partir de los textos de fuentes/txt/ y las
// soluciones de fuentes/soluciones/ (o las incluidas en el propio examen).
//
// Pasos: parsear → aplicar plantilla y correcciones oficiales → validar cada examen
// → agrupar la misma pregunta de todas las convocatorias → decidir unidad y respuesta
// → recortar figuras a public/img/ → escribir.
//
// Si dos fuentes oficiales dan respuestas distintas para la misma pregunta, el build
// falla hasta que la discrepancia se resuelva a mano en scripts/revisiones.json.
//
// Uso: node scripts/construir-preguntas.mjs

import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { parsearAndalucia, parsearBaleares, validarExamen, claveDedup, normalizar, pideImagen } from './lib/parsers.mjs'
import { cargarExamenes, orden } from './lib/examenes.mjs'

const run = promisify(execFile)
const existe = (p) => access(p).then(() => true, () => false)
const python = process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python'

const programa = JSON.parse(await readFile('data/programa.json', 'utf8'))
const reparto = programa.unidades.map((u) => [u.numero, u.preguntas])
const examenes = (await cargarExamenes()).sort((a, b) => orden(a).localeCompare(orden(b)) || a.id.localeCompare(b.id))
const { revisiones } = JSON.parse(await readFile('scripts/revisiones.json', 'utf8'))

const errores = []
const grupos = new Map() // clave → [aparición]
let totalLeidas = 0

// 1. Leer cada examen.
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
  const errs = validarExamen(preguntas, reparto)
  if (errs.length) {
    errores.push(...errs.map((e) => `${ex.id}: ${e}`))
    continue
  }
  totalLeidas += preguntas.length

  for (const p of preguntas) {
    // Dos opciones idénticas en el original: la pregunta no se puede contestar bien.
    const literal = p.opciones.map((o) => o.toLowerCase().replace(/\s+/g, ' ').replace(/[.\s]+$/, ''))
    if (!p.excluir && new Set(literal).size < 4) p.excluir = `la fuente repite una opción («${p.opciones[literal.findIndex((o, i) => literal.indexOf(o) !== i)]}»)`
    const clave = claveDedup(p)
    if (!grupos.has(clave)) grupos.set(clave, [])
    grupos.get(clave).push({
      ex,
      p,
      figura: figuras.has(p.numero),
      pideImagen: p.etiquetas.length > 0 || pideImagen(p.enunciado),
    })
  }
}

// 2. Decidir unidad y respuesta de cada pregunta.
const usadas = new Set()
const revisionDe = (enunciado, opciones) =>
  revisiones.find(
    (r) => normalizar(enunciado).startsWith(normalizar(r.enunciado)) && (r.excluir || opciones.some((o) => normalizar(o) === normalizar(r.respuesta))),
  )

/** Lo más votado; en empate, lo de la aparición más reciente. */
function masVotado(apariciones, valor) {
  const votos = new Map()
  apariciones.forEach((a, i) => {
    const v = valor(a)
    const prev = votos.get(v) ?? { n: 0, ultima: -1 }
    votos.set(v, { n: prev.n + 1, ultima: i })
  })
  return [...votos.entries()].sort((a, b) => b[1].n - a[1].n || b[1].ultima - a[1].ultima)[0][0]
}

const banco = []
const excluidas = []
const discrepanciasUnidad = []
const sinFigura = []
for (const apariciones of grupos.values()) {
  // apariciones ya va en orden cronológico (examenes ordenados).
  const primera = apariciones[0]
  const ultima = apariciones.at(-1)
  const id = `${primera.ex.id}-${primera.p.numero}`
  const rep = ultima.p // texto de la versión más reciente

  // Unidad: manda la cabecera explícita de Andalucía; si no, la posición en el examen.
  const explicitas = apariciones.filter((a) => a.ex.formato === 'andalucia')
  const unidad = masVotado(explicitas.length ? explicitas : apariciones, (a) => a.p.unidad)
  if (new Set(apariciones.map((a) => a.p.unidad)).size > 1) discrepanciasUnidad.push(id)

  // Respuesta: todas las fuentes deben coincidir (por texto, el orden de las opciones puede variar).
  const validas = apariciones.filter((a) => !a.p.excluir)
  const respuestas = new Set(validas.map((a) => normalizar(a.p.opciones[a.p.correcta])))
  const revision = revisionDe(rep.enunciado, rep.opciones)
  let respuesta
  if (revision) {
    usadas.add(revision)
    if (revision.excluir) {
      excluidas.push(`${id}: ${revision.excluir}`)
      continue
    }
    respuesta = normalizar(revision.respuesta)
  } else if (!validas.length) {
    excluidas.push(`${id}: ${apariciones[0].p.excluir}`)
    continue
  } else if (respuestas.size > 1) {
    errores.push(
      `Respuestas discrepantes (${id}) «${rep.enunciado}»\n` +
        validas.map((a) => `    ${a.ex.id}-${a.p.numero}: «${a.p.opciones[a.p.correcta]}»`).join('\n'),
    )
    continue
  } else {
    respuesta = [...respuestas][0]
  }
  const correcta = rep.opciones.findIndex((o) => normalizar(o) === respuesta)
  if (correcta < 0) {
    errores.push(`${id}: la respuesta «${respuesta}» no está entre las opciones de la versión más reciente`)
    continue
  }

  // Figura: la de la aparición más reciente que la tenga.
  const conFigura = apariciones.filter((a) => a.figura).at(-1)
  const requiereImagen = apariciones.some((a) => a.figura || a.pideImagen)
  if (requiereImagen && !conFigura) sinFigura.push(id)

  banco.push({
    id,
    unidad,
    enunciado: rep.enunciado,
    opciones: rep.opciones,
    correcta,
    requiereCarta: unidad === 11,
    ...(requiereImagen && { requiereImagen: true }),
    ...(conFigura && { _figura: conFigura }),
    ...(revision && { revision: revision.motivo }),
    fuentes: apariciones.map((a) => ({
      examen: a.ex.id,
      numero: a.p.numero,
      ...(a.p.correccion && { correccion: a.p.correccion }),
    })),
  })
}

for (const r of revisiones) if (!usadas.has(r)) errores.push(`Revisión sin pregunta: «${r.enunciado}»`)

if (errores.length) {
  console.error(`ERRORES (${errores.length}):\n` + errores.join('\n'))
  process.exit(1)
}

// 3. Recortar las figuras a public/img/<id>.webp.
await mkdir('public/img', { recursive: true })
for (const p of banco) {
  const fig = p._figura
  delete p._figura
  if (!fig) continue
  const destino = `public/img/${p.id}.webp`
  if (!(await existe(destino))) {
    await run(python, ['-I', 'scripts/recortar_figuras.py', `fuentes/pdf/${fig.ex.id}.pdf`, `fuentes/figuras/${fig.ex.id}.json`, String(fig.p.numero), destino])
  }
  p.imagen = `img/${p.id}.webp`
}

// 4. Escribir.
banco.sort((a, b) => a.unidad - b.unidad || a.id.localeCompare(b.id))
const usados = new Set(banco.flatMap((p) => p.fuentes.map((f) => f.examen)))
const tablaExamenes = Object.fromEntries(
  examenes
    .filter((ex) => usados.has(ex.id))
    .map((ex) => [
      ex.id,
      {
        comunidad: ex.comunidad,
        convocatoria: ex.convocatoria,
        modelo: ex.modelo,
        url: ex.examen,
        ...(ex.plantilla && { plantilla: ex.plantilla }),
      },
    ]),
)
// Un examen y una pregunta por línea: el fichero es compacto y los diffs se pueden revisar.
const salida =
  '{\n  "examenes": {\n' +
  Object.entries(tablaExamenes)
    .map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    .join(',\n') +
  '\n  },\n  "preguntas": [\n' +
  banco.map((p) => `    ${JSON.stringify(p)}`).join(',\n') +
  '\n  ]\n}\n'
JSON.parse(salida) // comprobación
await writeFile('data/preguntas.json', salida, 'utf8')

const porUnidad = Object.fromEntries(programa.unidades.map((u) => [u.numero, banco.filter((p) => p.unidad === u.numero).length]))
console.log(`Leídas ${totalLeidas} preguntas de ${examenes.length} exámenes → ${banco.length} únicas`)
console.log('Por unidad:', porUnidad)
console.log(`Repetidas en varias fuentes: ${banco.filter((p) => p.fuentes.length > 1).length}`)
console.log(`Con imagen: ${banco.filter((p) => p.imagen).map((p) => p.id).join(', ') || 'ninguna'}`)
console.log(`Piden imagen y no se ha encontrado (se excluyen de los tests): ${sinFigura.join(', ') || 'ninguna'}`)
console.log(`Resueltas en revisiones.json: ${banco.filter((p) => p.revision).length}`)
console.log(`Unidad distinta según la fuente (se usa la mayoritaria): ${discrepanciasUnidad.length}`)
console.log(`Excluidas: ${excluidas.join('; ') || 'ninguna'}`)
console.log(`Con corrección oficial aplicada: ${banco.filter((p) => p.fuentes.some((f) => f.correccion)).map((p) => p.id).join(', ') || 'ninguna'}`)
