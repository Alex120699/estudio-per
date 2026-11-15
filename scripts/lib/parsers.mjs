// Parsers de los cuestionarios oficiales (texto de `pdftotext -layout`).
// Devuelven [{ numero, unidad, enunciado, opciones: [4], correcta (0-3 | null) }].

const limpiar = (s) => s.replace(/\s+/g, ' ').trim()

/**
 * Con `pdftotext -layout`, las etiquetas de una figura situada a la derecha del texto
 * aparecen en la misma línea tras un hueco grande. Se cortan y se devuelven aparte.
 */
export function separarEtiquetas(linea) {
  const m = linea.match(/^(.*?\S)\s{5,}(\S.*)$/)
  return m ? { texto: m[1], etiqueta: m[2].trim() } : { texto: linea, etiqueta: null }
}

/** Une las líneas acumuladas de cada pregunta/opción. */
function cerrar(preguntas) {
  return preguntas.map((p) => ({
    ...p,
    enunciado: limpiar(p.enunciado.join(' ')),
    opciones: p.opciones.map((o) => limpiar(o.join(' '))),
  }))
}

/**
 * Andalucía: cabeceras «UNIDAD TEÓRICA N. …», preguntas «N. …» y opciones «a) …».
 * Las respuestas vienen aparte (plantilla), así que correcta = null.
 */
export function parsearAndalucia(texto) {
  const lineas = texto.replace(/\f/g, '\n').split(/\r?\n/)
  const preguntas = []
  const ignoradas = []
  let unidad = null
  let actual = null
  let destino = null // array de líneas al que se añaden las continuaciones

  for (const original of lineas) {
    const { texto: bruta, etiqueta } = separarEtiquetas(original)
    if (etiqueta && actual) actual.etiquetas.push(etiqueta)
    const l = bruta.trim()
    const cab = l.match(/^UNIDAD TEÓRICA (\d+)\b/)
    if (cab) {
      unidad = Number(cab[1])
      destino = null
      continue
    }
    if (unidad === null || !l) continue

    const q = bruta.match(/^\s{0,8}(\d{1,2})\.\s+(\S.*)$/)
    if (q && Number(q[1]) === preguntas.length + 1) {
      actual = { numero: Number(q[1]), unidad, enunciado: [q[2]], opciones: [], correcta: null, etiquetas: [] }
      preguntas.push(actual)
      destino = actual.enunciado
      continue
    }
    const o = l.match(/^([a-d])\)\s*(.*)$/)
    if (o && actual && 'abcd'.indexOf(o[1]) === actual.opciones.length) {
      const op = [o[2]]
      actual.opciones.push(op)
      destino = op
      continue
    }
    // Ruido de maquetación: cabeceras de página, notas entre paréntesis tras la cabecera de unidad.
    if (/^EXAMEN PARA LA OBTENCI|^EMBARCACIONES DE RECREO$|^\d+$|^Página \d+/i.test(l) || (destino === null && l.startsWith('('))) {
      ignoradas.push(l)
      continue
    }
    if (destino) destino.push(l)
    else ignoradas.push(l)
  }
  return { preguntas: cerrar(preguntas), ignoradas }
}

/**
 * Baleares (versión en castellano): «N. …», opciones «A: …» y «Resposta correcta: X»
 * tras cada pregunta. No hay cabeceras de unidad: se asigna por posición con el
 * reparto oficial (`reparto` = [[unidad, nPreguntas], …] en orden).
 */
export function parsearBaleares(texto, reparto) {
  const lineas = texto.replace(/\f/g, '\n').split(/\r?\n/)
  const preguntas = []
  const ignoradas = []
  let actual = null
  let destino = null

  for (const original of lineas) {
    const { texto: bruta, etiqueta } = separarEtiquetas(original)
    if (etiqueta && actual) actual.etiquetas.push(etiqueta)
    const l = bruta.trim()
    if (!l) continue
    if (/^(Examen|Convocat[oò]ria|Model d|SECCI[OÓ]N?:)/i.test(l)) {
      destino = null
      ignoradas.push(l)
      continue
    }
    if (/^\d+-\d+$/.test(l) || /^\d$/.test(l)) {
      ignoradas.push(l) // número de página «8-9» o restos sueltos
      continue
    }
    const r = l.match(/^Respu?ost?a correcta:\s*([A-D])\b/i)
    if (r && actual) {
      actual.correcta = 'ABCD'.indexOf(r[1].toUpperCase())
      destino = null
      continue
    }
    // «Respostes correctes: B i C»: la fuente da varias por buenas (opciones repetidas).
    const rs = l.match(/^Respu?ost?es correct[ae]s:\s*(.+)$/i)
    if (rs && actual) {
      actual.correcta = -1
      actual.excluir = `la fuente da varias respuestas correctas (${rs[1].trim()})`
      destino = null
      continue
    }
    const q = l.match(/^(\d{1,2})\.\s*(\S.*)$/)
    if (q && Number(q[1]) === preguntas.length + 1 && (!actual || actual.correcta !== null)) {
      actual = { numero: Number(q[1]), unidad: null, enunciado: [q[2]], opciones: [], correcta: null, etiquetas: [] }
      preguntas.push(actual)
      destino = actual.enunciado
      continue
    }
    const o = l.match(/^([A-D]):\s*(.*)$/)
    if (o && actual && 'ABCD'.indexOf(o[1]) === actual.opciones.length) {
      const op = [o[2]]
      actual.opciones.push(op)
      destino = op
      continue
    }
    if (destino) destino.push(l)
    else ignoradas.push(l)
  }

  // Unidad por posición.
  let i = 0
  for (const [unidad, n] of reparto) {
    for (let k = 0; k < n && i < preguntas.length; k++) preguntas[i++].unidad = unidad
  }
  return { preguntas: cerrar(preguntas), ignoradas }
}

/** Normaliza un texto para comparar preguntas entre convocatorias. */
export function normalizar(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[º°]/g, 'o')
    .replace(/[–—−]/g, '-')
    .replace(/[^a-z0-9-]+/g, ' ')
    .trim()
}

/** Clave de deduplicado: enunciado + conjunto de opciones (sin orden). */
export function claveDedup(p) {
  return normalizar(p.enunciado) + ' || ' + p.opciones.map(normalizar).sort().join(' | ')
}

/** Heurística: la pregunta remite a una figura que no está en el texto. */
export function pideImagen(enunciado) {
  return /\b(de la|en la|siguiente) (figura|imagen|ilustraci[oó]n|dibujo)\b|\bfigura adjunta\b/i.test(enunciado)
}

/**
 * Valida un examen ya parseado y con respuestas. Devuelve la lista de errores.
 * `reparto` = [[unidad, n], …] del examen completo de 45 preguntas.
 */
export function validarExamen(preguntas, reparto) {
  const errores = []
  const total = reparto.reduce((a, [, n]) => a + n, 0)
  if (preguntas.length !== total) errores.push(`${preguntas.length} preguntas (esperadas ${total})`)
  preguntas.forEach((p, i) => {
    if (p.numero !== i + 1) errores.push(`numeración rota en la posición ${i + 1}`)
    if (p.opciones.length !== 4) errores.push(`pregunta ${p.numero}: ${p.opciones.length} opciones`)
    if (p.opciones.some((o) => !o)) errores.push(`pregunta ${p.numero}: opción vacía`)
    if (!p.enunciado) errores.push(`pregunta ${p.numero}: enunciado vacío`)
    if (!p.excluir && !(Number.isInteger(p.correcta) && p.correcta >= 0 && p.correcta <= 3)) errores.push(`pregunta ${p.numero}: sin respuesta correcta`)
    if (!(Number.isInteger(p.unidad) && p.unidad >= 1 && p.unidad <= 11)) errores.push(`pregunta ${p.numero}: unidad ${p.unidad}`)
  })
  for (const [unidad, n] of reparto) {
    const hay = preguntas.filter((p) => p.unidad === unidad).length
    if (hay !== n) errores.push(`UT${unidad}: ${hay} preguntas (esperadas ${n})`)
  }
  // El examen sigue el orden de las unidades: comprobar que la unidad por posición coincide.
  let i = 0
  for (const [unidad, n] of reparto) {
    for (let k = 0; k < n; k++, i++) {
      if (preguntas[i] && preguntas[i].unidad !== unidad) {
        errores.push(`pregunta ${i + 1}: unidad ${preguntas[i].unidad}, por posición sería ${unidad}`)
      }
    }
  }
  return errores
}
