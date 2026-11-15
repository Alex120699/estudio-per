// Apuntes por unidad: un Markdown por unidad en /apuntes, con un «## N.M Título» por
// cada apartado del programa oficial (así el índice es el propio programa).

import { Marked } from 'marked'

export interface SeccionApunte {
  /** Código del apartado del programa, p. ej. «6.2». */
  codigo: string
  titulo: string
  /** id del encabezado en el HTML. */
  id: string
}

export interface Apunte {
  unidad: number
  /** Título del «# …» inicial. */
  titulo: string
  secciones: SeccionApunte[]
  html: string
}

const CODIGO = /^(\d+\.\d+)\s+(.+)$/

export const idSeccion = (codigo: string) => `ap-${codigo.replace('.', '-')}`

const slug = (texto: string) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export function procesarApunte(unidad: number, md: string): Apunte {
  const secciones: SeccionApunte[] = []
  let titulo = `UT ${unidad}`
  const usados = new Set<string>()

  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth, text }) {
        const contenido = this.parser.parseInline(tokens)
        if (depth === 1) {
          titulo = text
          return '' // el título lo pinta el componente
        }
        let id: string
        const m = depth === 2 ? CODIGO.exec(text) : null
        if (m) {
          id = idSeccion(m[1])
          secciones.push({ codigo: m[1], titulo: m[2], id })
        } else {
          id = `ap-${slug(text)}`
          while (usados.has(id)) id += '-'
        }
        usados.add(id)
        return `<h${depth} id="${id}">${contenido}</h${depth}>\n`
      },
      // Las tablas, dentro de un contenedor desplazable para que no rompan el ancho en el móvil.
      table(token) {
        const celdas = (fila: typeof token.header, etiqueta: 'th' | 'td') =>
          fila
            .map((c, i) => {
              const alin = token.align[i] ? ` style="text-align:${token.align[i]}"` : ''
              return `<${etiqueta}${alin}>${this.parser.parseInline(c.tokens)}</${etiqueta}>`
            })
            .join('')
        const cabecera = `<tr>${celdas(token.header, 'th')}</tr>`
        const cuerpo = token.rows.map((f) => `<tr>${celdas(f, 'td')}</tr>`).join('\n')
        return `<div class="tabla-scroll"><table><thead>${cabecera}</thead><tbody>${cuerpo}</tbody></table></div>\n`
      },
    },
  })

  const html = marked.parse(md, { async: false })
  return { unidad, titulo, secciones, html }
}
