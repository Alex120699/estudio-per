// Lista completa de exámenes: los de scripts/fuentes.json (mantenidos a mano) más
// los de Baleares que encuentra scripts/descubrir-baleares.mjs.

import { readFile } from 'node:fs/promises'

export async function cargarExamenes() {
  const manual = JSON.parse(await readFile('scripts/fuentes.json', 'utf8')).examenes
  let baleares = []
  try {
    baleares = JSON.parse(await readFile('scripts/fuentes-baleares.json', 'utf8')).examenes
  } catch {
    // Aún no se ha ejecutado el descubrimiento.
  }
  const ids = new Set(manual.map((e) => e.id))
  const examenes = [...manual, ...baleares.filter((e) => !ids.has(e.id))]
  return examenes
}

/** Clave para ordenar exámenes en el tiempo (más reciente = mayor). */
export const orden = (ex) => ex.fecha ?? ex.convocatoria
