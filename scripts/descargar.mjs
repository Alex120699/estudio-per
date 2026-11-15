// Descarga los PDFs de los exámenes (scripts/fuentes.json y fuentes-baleares.json) a fuentes/pdf/ y extrae su texto
// con `pdftotext -layout` a fuentes/txt/. No vuelve a descargar lo que ya existe.
//
// Uso: node scripts/descargar.mjs

import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { cargarExamenes } from './lib/examenes.mjs'

const run = promisify(execFile)
const existe = (p) => access(p).then(() => true, () => false)

async function bajar(url, destino) {
  if (await existe(destino)) return
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (app-per)' } })
  if (!res.ok) throw new Error(`${res.status} al descargar ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.subarray(0, 5).toString() !== '%PDF-') throw new Error(`No es un PDF: ${url}`)
  await writeFile(destino, buf)
  console.log('descargado', destino)
}

const examenes = await cargarExamenes()
await mkdir('fuentes/pdf', { recursive: true })
await mkdir('fuentes/txt', { recursive: true })

for (const ex of examenes) {
  const pdf = `fuentes/pdf/${ex.id}.pdf`
  await bajar(ex.examen, pdf)
  await run('pdftotext', ['-enc', 'UTF-8', '-layout', pdf, `fuentes/txt/${ex.id}.txt`])
  if (ex.plantilla) await bajar(ex.plantilla, `fuentes/pdf/${ex.id}.plantilla.pdf`)
}
console.log(`${examenes.length} exámenes listos`)
