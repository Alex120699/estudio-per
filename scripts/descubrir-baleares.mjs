// Descubre los exámenes resueltos del PER publicados por el Govern de les Illes Balears
// (CAIB) y escribe scripts/fuentes-baleares.json.
//
// Recorre las páginas de convocatorias enlazadas desde la más reciente, descarga cada
// PDF enlazado (caché en fuentes/caib/, no versionada) y se queda con los que son un
// examen completo del PER en castellano: cabecera «Prova teòrica PER», 45 preguntas con
// 4 opciones y su «Resposta correcta». Los demás (PNB, PER específico, Patrón de Yate,
// resoluciones…) quedan en «descartados» con el motivo, para poder revisarlo.
//
// Uso: node scripts/descubrir-baleares.mjs

import { readFile, writeFile, mkdir, access, copyFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { parsearBaleares, validarExamen, convocatoria } from './lib/parsers.mjs'

const run = promisify(execFile)
const existe = (p) => access(p).then(() => true, () => false)
const BASE = 'https://www.caib.es/sites/transportmaritim/es/'
const INICIO = BASE + 'convocatoria_de_septiembre_de_2026_examenes_resueltos/'
const UA = { headers: { 'User-Agent': 'Mozilla/5.0 (app-per)' } }

async function texto(url) {
  const r = await fetch(url, UA)
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r.text()
}

const programa = JSON.parse(await readFile('data/programa.json', 'utf8'))
const reparto = programa.unidades.map((u) => [u.numero, u.preguntas])
await mkdir('fuentes/caib', { recursive: true })
await mkdir('fuentes/pdf', { recursive: true })

// 1. Páginas de convocatorias (todas aparecen en el menú lateral).
const inicio = await texto(INICIO)
const paginas = [...new Set([...inicio.matchAll(/href="\/sites\/transportmaritim\/es\/([^"]*(?:examen|respuest)[^"]*)"/gi)].map((m) => BASE + m[1]))]

// 2. Enlaces a documentos de cada página.
const enlaces = new Map() // archivo → { url, pagina }
for (const pagina of paginas) {
  const html = await texto(pagina)
  for (const m of html.matchAll(/href="\s*([^"]*archivopub\.do[^"]*)"/gi)) {
    const url = new URL(m[1].replace(/&amp;/g, '&').trim(), pagina).href
    const archivo = /[?&]id=(\d+)/.exec(url)?.[1]
    if (archivo && !enlaces.has(archivo)) enlaces.set(archivo, { url, pagina })
  }
}
console.log(`${paginas.length} páginas, ${enlaces.size} documentos`)

// 3. Descargar (con caché), extraer texto y clasificar.
const examenes = []
const descartados = []
const vistos = new Map() // texto de las preguntas → id (el mismo examen enlazado dos veces)
const pendientes = [...enlaces.entries()]
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (pendientes.length) {
      const [archivo, { url }] = pendientes.shift()
      const pdf = `fuentes/caib/${archivo}.pdf`
      if (!(await existe(pdf))) {
        const r = await fetch(url, UA)
        await writeFile(pdf, Buffer.from(await r.arrayBuffer()))
      }
    }
  }),
)

for (const [archivo, { url, pagina }] of [...enlaces.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))) {
  const pdf = `fuentes/caib/${archivo}.pdf`
  const descartar = (motivo) => descartados.push({ archivo, url, motivo })
  if ((await readFile(pdf)).subarray(0, 5).toString() !== '%PDF-') {
    descartar('no es un PDF')
    continue
  }
  const { stdout: txt } = await run('pdftotext', ['-enc', 'UTF-8', '-layout', pdf, '-'], { maxBuffer: 1 << 26 })
  const cab = txt.slice(0, 1500).replace(/\s+/g, ' ')
  const ex = /Examen:\s*(.*?)\s*Convocat[oò]ria:\s*(.*?)\s*Model d.ex[aà]mens?:\s*((?:model\s+)?\S*)/i.exec(cab)
  if (!ex) {
    descartar('sin cabecera de examen')
    continue
  }
  if (!/Prova te[oò]rica PER\b/i.test(ex[1])) {
    descartar(`no es del PER: «${ex[1]}»`)
    continue
  }
  const { preguntas } = parsearBaleares(txt, reparto)
  const errores = validarExamen(preguntas, reparto)
  if (errores.length) {
    descartar(`no es un examen completo válido (${errores[0]}${errores.length > 1 ? ` y ${errores.length - 1} más` : ''})`)
    continue
  }
  const enunciados = preguntas.map((p) => p.enunciado).join(' ')
  const ca = (enunciados.match(/(?<!\p{L})(dels|els|amb|quan|quin|quina|embarcació|vaixell|és)(?!\p{L})/giu) ?? []).length
  const es = (enunciados.match(/(?<!\p{L})(los|del|con|cuando|qué|cuál|embarcación|buque)(?!\p{L})/giu) ?? []).length
  if (ca > es) {
    descartar('versión en catalán (se usa la castellana)')
    continue
  }
  const huella = preguntas.map((p) => p.enunciado).join('|')
  if (vistos.has(huella)) {
    descartar(`duplicado de ${vistos.get(huella)}`)
    continue
  }
  const conv = convocatoria(ex[2])
  if (!conv) {
    descartar(`convocatoria ilegible: «${ex[2]}»`)
    continue
  }
  const modelo = /^(?:MODEL\s+)?([A-Z])\b/.exec(ex[3].toUpperCase())?.[1]
  let id = modelo ? `bal-${conv}-${modelo}` : `bal-${conv}-${archivo}`
  if (examenes.some((e) => e.id === id)) id = `bal-${conv}-${archivo}`
  vistos.set(huella, id)
  examenes.push({ id, comunidad: 'Illes Balears', convocatoria: conv, modelo: modelo ?? '?', formato: 'baleares', pagina, examen: url })
  if (!(await existe(`fuentes/pdf/${id}.pdf`))) await copyFile(pdf, `fuentes/pdf/${id}.pdf`)
}

examenes.sort((a, b) => a.id.localeCompare(b.id))
await writeFile(
  'scripts/fuentes-baleares.json',
  JSON.stringify(
    {
      _comentario: 'Generado por scripts/descubrir-baleares.mjs. No editar a mano: las erratas y revisiones van en scripts/revisiones.json.',
      examenes,
      descartados,
    },
    null,
    2,
  ) + '\n',
)
console.log(`${examenes.length} exámenes del PER, ${descartados.length} documentos descartados`)
