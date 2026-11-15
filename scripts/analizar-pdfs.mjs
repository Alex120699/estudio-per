// Análisis de los PDF con Python (pypdfium2) y resultados versionados para revisión:
//  - fuentes/soluciones/<id>.json: respuestas leídas por OMR de las plantillas escaneadas
//    (formato 'andalucia'),
//  - fuentes/figuras/<id>.json: preguntas que llevan figura en el cuestionario.
//
// Requiere el entorno Python local:
//   python -m venv .venv && .venv/Scripts/pip install pypdfium2 pillow
//
// Uso: node scripts/analizar-pdfs.mjs [--forzar]

import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { cargarExamenes } from './lib/examenes.mjs'

const run = promisify(execFile)
const existe = (p) => access(p).then(() => true, () => false)
const forzar = process.argv.includes('--forzar')
const python = process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python'
const py = async (script, args) => JSON.parse((await run(python, ['-I', script, ...args])).stdout)

const examenes = await cargarExamenes()
await mkdir('fuentes/soluciones', { recursive: true })
await mkdir('fuentes/figuras', { recursive: true })

let problemas = 0
for (const ex of examenes) {
  const figuras = `fuentes/figuras/${ex.id}.json`
  if (forzar || !(await existe(figuras))) {
    const res = await py('scripts/detectar_figuras.py', [`fuentes/pdf/${ex.id}.pdf`, ...(ex.formato === 'andalucia' ? ['--portada'] : [])])
    await writeFile(figuras, JSON.stringify({ id: ex.id, ...res }, null, 2) + '\n')
    console.log(`${ex.id}: figuras en ${JSON.stringify(res.preguntas)}`)
  }

  if (!ex.plantilla) continue
  const destino = `fuentes/soluciones/${ex.id}.json`
  if (!forzar && (await existe(destino))) continue
  const res = await py('scripts/leer_plantilla.py', [`fuentes/pdf/${ex.id}.plantilla.pdf`, '--n', '45'])
  const n = Object.keys(res.respuestas).length
  if (n !== 45 || res.avisos.length) {
    problemas++
    console.warn(`⚠ ${ex.id}: ${n} respuestas`, res.avisos)
  }
  await writeFile(
    destino,
    JSON.stringify({ id: ex.id, plantilla: ex.plantilla, metodo: 'OMR (scripts/leer_plantilla.py)', ...res }, null, 2) + '\n',
  )
  console.log(`${ex.id}: ${n} respuestas, confianza mínima ${res.confianzaMinima}`)
}
if (problemas) process.exit(1)
