// Historial en IndexedDB (Dexie). Tablas según PLAN.md:
//   respuestas:  { preguntaId, fecha, elegida, acierto, modo, sesionId }
//   sesiones:    { id, tipo, inicio, fin, preguntas, resultado }
//   cajaFallos:  { preguntaId, aciertosSeguidos, ultimoAcierto }
// La caja es derivable del historial (calcularCaja); se guarda para leerla rápido y se
// recalcula entera al importar una copia.

import Dexie, { type EntityTable } from 'dexie'
import {
  aplicarACaja,
  calcularCaja,
  crearExportacion,
  fusionar,
  validarExportacion,
  type EntradaCaja,
  type Exportacion,
  type RegistroRespuesta,
  type RegistroSesion,
} from '../logica/historial'

export class BaseDatos extends Dexie {
  respuestas!: EntityTable<RegistroRespuesta, 'id'>
  sesiones!: EntityTable<RegistroSesion, 'id'>
  cajaFallos!: EntityTable<EntradaCaja, 'preguntaId'>

  constructor(nombre = 'estudio-per') {
    super(nombre)
    this.version(1).stores({
      respuestas: '++id, preguntaId, sesionId, fecha',
      sesiones: 'id, fin, tipo',
      cajaFallos: 'preguntaId',
    })
  }
}

export const db = new BaseDatos()

/** Guarda respuestas y actualiza la caja de fallos en una sola transacción. */
export async function registrarRespuestas(regs: readonly RegistroRespuesta[], base: BaseDatos = db): Promise<void> {
  if (!regs.length) return
  await base.transaction('rw', base.respuestas, base.cajaFallos, async () => {
    await base.respuestas.bulkAdd(regs.map((r) => ({ ...r })))
    for (const r of [...regs].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
      const nueva = aplicarACaja(await base.cajaFallos.get(r.preguntaId), r)
      if (nueva === null) await base.cajaFallos.delete(r.preguntaId)
      else if (nueva) await base.cajaFallos.put(nueva)
    }
  })
}

export async function guardarSesion(s: RegistroSesion, base: BaseDatos = db): Promise<void> {
  await base.sesiones.put(s)
}

export interface Historial {
  respuestas: RegistroRespuesta[]
  sesiones: RegistroSesion[]
  caja: Map<string, EntradaCaja>
}

export async function leerHistorial(base: BaseDatos = db): Promise<Historial> {
  const [respuestas, sesiones, caja] = await Promise.all([base.respuestas.toArray(), base.sesiones.toArray(), base.cajaFallos.toArray()])
  return { respuestas, sesiones, caja: new Map(caja.map((e) => [e.preguntaId, e])) }
}

export async function exportar(base: BaseDatos = db): Promise<Exportacion> {
  const { respuestas, sesiones } = await leerHistorial(base)
  return crearExportacion(respuestas, sesiones)
}

/** Importa una copia fusionándola con lo que ya hay. Devuelve cuántos registros nuevos se añadieron. */
export async function importar(datos: unknown, base: BaseDatos = db): Promise<{ respuestas: number; sesiones: number }> {
  const copia = validarExportacion(datos)
  return base.transaction('rw', base.respuestas, base.sesiones, base.cajaFallos, async () => {
    const actuales = { respuestas: await base.respuestas.toArray(), sesiones: await base.sesiones.toArray() }
    const { respuestasNuevas, sesionesNuevas } = fusionar(actuales, copia)
    await base.respuestas.bulkAdd(respuestasNuevas)
    await base.sesiones.bulkAdd(sesionesNuevas)
    const caja = calcularCaja([...actuales.respuestas, ...respuestasNuevas])
    await base.cajaFallos.clear()
    await base.cajaFallos.bulkPut([...caja.values()])
    return { respuestas: respuestasNuevas.length, sesiones: sesionesNuevas.length }
  })
}

export async function borrarTodo(base: BaseDatos = db): Promise<void> {
  await base.transaction('rw', base.respuestas, base.sesiones, base.cajaFallos, async () => {
    await Promise.all([base.respuestas.clear(), base.sesiones.clear(), base.cajaFallos.clear()])
  })
}
