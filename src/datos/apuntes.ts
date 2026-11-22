import { procesarApunte, type Apunte } from '../logica/apuntes'

// Los .md van dentro del bundle: así los apuntes funcionan sin conexión.
const ficheros = import.meta.glob<string>('../../apuntes/ut*.md', { query: '?raw', import: 'default', eager: true })

const cache = new Map<number, Apunte>()

/** Markdown original de cada unidad (clave: número de unidad). */
export const markdownApuntes: ReadonlyMap<number, string> = new Map(
  Object.entries(ficheros).map(([ruta, md]) => [Number(/ut(\d+)\.md$/.exec(ruta)![1]), md]),
)

export function apunteDe(unidad: number): Apunte | null {
  const md = markdownApuntes.get(unidad)
  if (md === undefined) return null
  let a = cache.get(unidad)
  if (!a) {
    a = procesarApunte(unidad, md, import.meta.env.BASE_URL)
    cache.set(unidad, a)
  }
  return a
}
