// Lógica pura del historial: caja de fallos, estadísticas y fusión de copias de seguridad.
// No depende de IndexedDB; la capa de datos está en src/datos/db.ts.

import type { Pregunta } from '../tipos/preguntas'
import type { TipoSimulacro } from './seleccion'
import type { Modo } from './sesion'

export type TipoSesion = 'simulacro' | 'tema' | 'repaso'

export interface RegistroRespuesta {
  id?: number
  preguntaId: string
  /** ISO 8601. */
  fecha: string
  /** Índice elegido, o null si se dejó en blanco. */
  elegida: number | null
  acierto: boolean
  modo: Modo
  sesionId: string
}

export interface RegistroSesion {
  id: string
  tipo: TipoSesion
  simulacro?: TipoSimulacro
  modo: Modo
  inicio: string
  fin: string
  preguntaIds: string[]
  respuestas: (number | null)[]
  resultado: {
    preguntas: number
    aciertos: number
    enBlanco: number
    apto?: boolean
    aptoPNB?: boolean
    motivos?: string[]
  }
}

export interface EntradaCaja {
  preguntaId: string
  /** Aciertos consecutivos contados en días distintos desde el último fallo. */
  aciertosSeguidos: number
  /** Día (AAAA-MM-DD, hora local) del último acierto que contó. */
  ultimoAcierto: string | null
  /** Fecha ISO en que entró (o volvió a entrar) en la caja. */
  entrada: string
}

/** Aciertos seguidos, en días distintos, necesarios para sacar una pregunta de la caja. */
export const ACIERTOS_PARA_SALIR = 2

/** Día local AAAA-MM-DD de una fecha. */
export function diaLocal(fecha: string | Date): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * Aplica una respuesta a la entrada de la caja de una pregunta.
 * - Fallo (o en blanco): entra en la caja, o reinicia su contador.
 * - Acierto de una pregunta en la caja: suma 1 si es un día distinto al del último
 *   acierto contado; al llegar a ACIERTOS_PARA_SALIR sale (devuelve null).
 * - Acierto de una pregunta que no está en la caja: no cambia nada (devuelve undefined).
 */
export function aplicarACaja(entrada: EntradaCaja | undefined, r: Pick<RegistroRespuesta, 'preguntaId' | 'acierto' | 'fecha'>): EntradaCaja | null | undefined {
  if (!r.acierto) return { preguntaId: r.preguntaId, aciertosSeguidos: 0, ultimoAcierto: null, entrada: entrada?.entrada ?? r.fecha }
  if (!entrada) return undefined
  const dia = diaLocal(r.fecha)
  if (entrada.ultimoAcierto === dia) return entrada
  const aciertosSeguidos = entrada.aciertosSeguidos + 1
  if (aciertosSeguidos >= ACIERTOS_PARA_SALIR) return null
  return { ...entrada, aciertosSeguidos, ultimoAcierto: dia }
}

/** Reconstruye la caja de fallos completa a partir de todo el historial de respuestas. */
export function calcularCaja(respuestas: readonly RegistroRespuesta[]): Map<string, EntradaCaja> {
  const caja = new Map<string, EntradaCaja>()
  const ordenadas = [...respuestas].sort((a, b) => a.fecha.localeCompare(b.fecha))
  for (const r of ordenadas) {
    const nueva = aplicarACaja(caja.get(r.preguntaId), r)
    if (nueva === null) caja.delete(r.preguntaId)
    else if (nueva) caja.set(r.preguntaId, nueva)
  }
  return caja
}

/** Preguntas de la caja que tiene sentido repasar hoy: las que no se han acertado ya hoy. */
export function pendientesHoy(caja: Iterable<EntradaCaja>, hoy: string = diaLocal(new Date())): EntradaCaja[] {
  return [...caja].filter((e) => e.ultimoAcierto !== hoy)
}

// --- Estadísticas -----------------------------------------------------------------

export interface EstadisticaPregunta {
  vista: number
  aciertos: number
  fallos: number
  ultimaFecha: string
  ultimaElegida: number | null
  ultimoAcierto: boolean
}

export function estadisticasPorPregunta(respuestas: readonly RegistroRespuesta[]): Map<string, EstadisticaPregunta> {
  const m = new Map<string, EstadisticaPregunta>()
  for (const r of [...respuestas].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const e = m.get(r.preguntaId) ?? { vista: 0, aciertos: 0, fallos: 0, ultimaFecha: r.fecha, ultimaElegida: null, ultimoAcierto: false }
    e.vista++
    if (r.acierto) e.aciertos++
    else e.fallos++
    e.ultimaFecha = r.fecha
    e.ultimaElegida = r.elegida
    e.ultimoAcierto = r.acierto
    m.set(r.preguntaId, e)
  }
  return m
}

export interface EstadisticaUnidad {
  unidad: number
  /** Preguntas utilizables del banco en la unidad. */
  enBanco: number
  /** Preguntas distintas vistas al menos una vez. */
  vistas: number
  respuestas: number
  aciertos: number
  /** % de acierto sobre todas las respuestas (null si no hay). */
  porcentaje: number | null
  enCaja: number
  /** % de acierto por semana (lunes AAAA-MM-DD), de la más antigua a la más reciente. */
  evolucion: { semana: string; porcentaje: number; respuestas: number }[]
}

/** Lunes (AAAA-MM-DD, hora local) de la semana de una fecha. */
export function semanaDe(fecha: string): string {
  const d = new Date(fecha)
  const desdeLunes = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - desdeLunes)
  return diaLocal(d)
}

export function estadisticasPorUnidad(
  unidades: readonly number[],
  banco: readonly Pregunta[],
  respuestas: readonly RegistroRespuesta[],
  caja: ReadonlyMap<string, EntradaCaja>,
): EstadisticaUnidad[] {
  const unidadDe = new Map(banco.map((p) => [p.id, p.unidad]))
  return unidades.map((unidad) => {
    const rs = respuestas.filter((r) => unidadDe.get(r.preguntaId) === unidad)
    const aciertos = rs.filter((r) => r.acierto).length
    const porSemana = new Map<string, { a: number; n: number }>()
    for (const r of rs) {
      const s = semanaDe(r.fecha)
      const v = porSemana.get(s) ?? { a: 0, n: 0 }
      v.n++
      if (r.acierto) v.a++
      porSemana.set(s, v)
    }
    return {
      unidad,
      enBanco: banco.filter((p) => p.unidad === unidad && (!p.requiereImagen || p.imagen)).length,
      vistas: new Set(rs.map((r) => r.preguntaId)).size,
      respuestas: rs.length,
      aciertos,
      porcentaje: rs.length ? Math.round((aciertos / rs.length) * 100) : null,
      enCaja: [...caja.keys()].filter((id) => unidadDe.get(id) === unidad).length,
      evolucion: [...porSemana.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([semana, v]) => ({ semana, porcentaje: Math.round((v.a / v.n) * 100), respuestas: v.n })),
    }
  })
}

export interface EstoyListo {
  /** Simulacros considerados (como mucho 5, los más recientes). */
  considerados: number
  aprobados: number
  /** % de aprobados entre los considerados (null si no hay simulacros). */
  porcentaje: number | null
}

/** Indicador «¿Estoy listo?»: % de los últimos 5 simulacros del tipo dado aprobados. */
export function estoyListo(sesiones: readonly RegistroSesion[], tipo: TipoSimulacro = 'completo', ultimos = 5): EstoyListo {
  const sims = sesiones
    .filter((s) => s.tipo === 'simulacro' && s.simulacro === tipo)
    .sort((a, b) => b.fin.localeCompare(a.fin))
    .slice(0, ultimos)
  const aprobados = sims.filter((s) => s.resultado.apto).length
  return { considerados: sims.length, aprobados, porcentaje: sims.length ? Math.round((aprobados / sims.length) * 100) : null }
}

// --- Copia de seguridad ------------------------------------------------------------

export const VERSION_EXPORTACION = 1

export interface Exportacion {
  app: 'estudio-per'
  version: number
  exportado: string
  respuestas: RegistroRespuesta[]
  sesiones: RegistroSesion[]
}

export function crearExportacion(respuestas: readonly RegistroRespuesta[], sesiones: readonly RegistroSesion[], ahora = new Date()): Exportacion {
  return {
    app: 'estudio-per',
    version: VERSION_EXPORTACION,
    exportado: ahora.toISOString(),
    // Los ids autoincrementales de IndexedDB no se exportan: no significan nada en otro dispositivo.
    respuestas: respuestas.map(({ id: _id, ...r }) => r),
    sesiones: [...sesiones],
  }
}

/** Comprueba la forma de un JSON importado. Lanza un Error con un mensaje claro si no es válido. */
export function validarExportacion(datos: unknown): Exportacion {
  const d = datos as Partial<Exportacion> | null
  if (!d || typeof d !== 'object' || d.app !== 'estudio-per') throw new Error('El fichero no es una copia de seguridad de Estudio PER.')
  if (typeof d.version !== 'number' || d.version > VERSION_EXPORTACION) {
    throw new Error('La copia es de una versión más nueva de la app. Actualiza la app e inténtalo otra vez.')
  }
  if (!Array.isArray(d.respuestas) || !Array.isArray(d.sesiones)) throw new Error('La copia está incompleta: faltan respuestas o sesiones.')
  for (const r of d.respuestas) {
    if (typeof r?.preguntaId !== 'string' || typeof r.fecha !== 'string' || typeof r.acierto !== 'boolean' || typeof r.sesionId !== 'string') {
      throw new Error('La copia contiene respuestas con un formato no válido.')
    }
  }
  for (const s of d.sesiones) {
    if (typeof s?.id !== 'string' || typeof s.fin !== 'string' || !s.resultado) throw new Error('La copia contiene sesiones con un formato no válido.')
  }
  return d as Exportacion
}

const claveRespuesta = (r: RegistroRespuesta) => `${r.sesionId}|${r.preguntaId}|${r.fecha}`

/**
 * Fusiona una copia importada con el historial existente sin duplicar:
 * sesiones por id y respuestas por (sesión, pregunta, fecha).
 */
export function fusionar(
  actuales: { respuestas: readonly RegistroRespuesta[]; sesiones: readonly RegistroSesion[] },
  importada: Exportacion,
): { respuestasNuevas: RegistroRespuesta[]; sesionesNuevas: RegistroSesion[] } {
  const hayR = new Set(actuales.respuestas.map(claveRespuesta))
  const hayS = new Set(actuales.sesiones.map((s) => s.id))
  const respuestasNuevas: RegistroRespuesta[] = []
  for (const { id: _id, ...r } of importada.respuestas) {
    const k = claveRespuesta(r)
    if (!hayR.has(k)) {
      hayR.add(k)
      respuestasNuevas.push(r)
    }
  }
  return { respuestasNuevas, sesionesNuevas: importada.sesiones.filter((s) => !hayS.has(s.id)) }
}
