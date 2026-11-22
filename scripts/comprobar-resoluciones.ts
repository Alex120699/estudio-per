/**
 * Compara el resultado de cada resolución paso a paso con la respuesta oficial.
 * Uso: npx vite-node scripts/comprobar-resoluciones.ts [filtro-de-id] [detalle]
 */
import faros from '../data/faros.json'
import datos from '../data/resoluciones.json'
import { preguntas } from '../src/tipos/preguntas'
import { resolver, type Planteamiento, type Punto } from '../src/logica/resolucion'

const puntos = (faros as { puntos: Record<string, Punto> }).puntos
const res = (datos as { resoluciones: Record<string, Planteamiento | { igual: string }> }).resoluciones
const [filtro, detalle] = process.argv.slice(2)

for (const [id, pl] of Object.entries(res)) {
  if (filtro && !id.includes(filtro)) continue
  const q = preguntas.find((x) => x.id === id)!
  const r = resolver(('igual' in pl ? res[pl.igual] : pl) as Planteamiento, puntos)
  const fin = r.lineas
    .filter((l) => l.final)
    .map((l) => l.texto)
    .join(' | ')
  console.log(id.padEnd(17), r.error ? `ERROR ${r.error}` : fin, '  ⇐ ', q.opciones[q.correcta])
  if (detalle) for (const l of r.lineas) console.log('    ', l.texto, l.nota ? `  (${l.nota})` : '')
}
