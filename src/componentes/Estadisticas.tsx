import { useMemo, useRef, useState } from 'react'
import { borrarTodo, exportar, importar, type Historial } from '../datos/db'
import { estadisticasPorUnidad, estoyListo, type RegistroSesion } from '../logica/historial'
import type { TipoSimulacro } from '../logica/seleccion'
import { preguntas as banco } from '../tipos/preguntas'
import { programa } from '../tipos/programa'
import GraficoSimulacros from './GraficoSimulacros'
import Sparkline from './Sparkline'

interface Props {
  historial: Historial
  onRecargar: () => Promise<void>
  onVolver: () => void
}

const MAX_BARRAS = 30
const MAX_SESIONES = 30

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function nombreSesion(s: RegistroSesion) {
  if (s.tipo === 'simulacro') return s.simulacro === 'complementario' ? 'Simulacro complementario' : 'Simulacro'
  if (s.tipo === 'repaso') return 'Repaso de fallos'
  return s.modo === 'estudio' ? 'Test por tema · estudio' : 'Test por tema'
}

function resultadoSesion(s: RegistroSesion) {
  const r = s.resultado
  const base = `${r.aciertos}/${r.preguntas}`
  if (s.tipo !== 'simulacro') return base
  return `${base} · ${r.apto ? '✓ apto' : '✗ no apto'}`
}

export default function Estadisticas({ historial, onRecargar, onVolver }: Props) {
  const [mensaje, setMensaje] = useState<{ texto: string; error?: boolean } | null>(null)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const fichero = useRef<HTMLInputElement>(null)

  const porUnidad = useMemo(
    () => estadisticasPorUnidad(programa.unidades.map((u) => u.numero), banco, historial.respuestas, historial.caja),
    [historial],
  )
  const sesiones = useMemo(() => [...historial.sesiones].sort((a, b) => a.fin.localeCompare(b.fin)), [historial])
  const simulacros = (tipo: TipoSimulacro) => sesiones.filter((s) => s.tipo === 'simulacro' && s.simulacro === tipo).slice(-MAX_BARRAS)
  const completos = simulacros('completo')
  const complementarios = simulacros('complementario')
  const listo = estoyListo(historial.sesiones)
  const total = historial.respuestas.length
  const aciertos = historial.respuestas.filter((r) => r.acierto).length

  async function descargar() {
    const datos = await exportar()
    const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 1)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `historial-per-${datos.exportado.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMensaje({ texto: `Copia descargada: ${datos.respuestas.length} respuestas y ${datos.sesiones.length} sesiones.` })
  }

  async function cargar(f: File | undefined) {
    if (!f) return
    try {
      const r = await importar(JSON.parse(await f.text()))
      await onRecargar()
      setMensaje({
        texto:
          r.respuestas + r.sesiones === 0
            ? 'Esa copia no tenía nada nuevo: ya estaba todo.'
            : `Importado: ${r.respuestas} respuestas y ${r.sesiones} sesiones nuevas.`,
      })
    } catch (e) {
      setMensaje({ texto: `No se pudo importar: ${e instanceof Error ? e.message : String(e)}`, error: true })
    } finally {
      if (fichero.current) fichero.current.value = ''
    }
  }

  async function borrar() {
    await borrarTodo()
    await onRecargar()
    setConfirmarBorrado(false)
    setMensaje({ texto: 'Historial borrado.' })
  }

  return (
    <main className="contenedor">
      <button className="volver" onClick={onVolver}>
        ← Inicio
      </button>
      <h1>Estadísticas</h1>

      <section className="resumen-stats">
        <div className="stat">
          <span className="cifra">{listo.porcentaje === null ? '—' : `${listo.porcentaje}%`}</span>
          <span className="etiqueta">¿Estoy listo?</span>
          <span className="detalle">
            {listo.considerados ? `${listo.aprobados} de los últimos ${listo.considerados} simulacros aprobados` : 'Haz algún simulacro'}
          </span>
        </div>
        <div className="stat">
          <span className="cifra">{total ? `${Math.round((aciertos / total) * 100)}%` : '—'}</span>
          <span className="etiqueta">Acierto global</span>
          <span className="detalle">{total} respuestas</span>
        </div>
        <div className="stat">
          <span className="cifra">{historial.caja.size}</span>
          <span className="etiqueta">En la caja de fallos</span>
          <span className="detalle">salen tras 2 aciertos en días distintos</span>
        </div>
      </section>

      <h2>Simulacros</h2>
      {completos.length === 0 ? (
        <p className="sub">Aún no has hecho ningún simulacro completo.</p>
      ) : (
        <GraficoSimulacros sesiones={completos} corte={programa.examen.completo.minAciertos} total={programa.examen.completo.preguntas} />
      )}
      {complementarios.length > 0 && (
        <>
          <h3>Complementario (PNB → PER)</h3>
          <GraficoSimulacros
            sesiones={complementarios}
            corte={programa.examen.complementarioPNB.minAciertos}
            total={programa.examen.complementarioPNB.preguntas}
          />
        </>
      )}

      <h2>Por unidad</h2>
      <div className="tabla-scroll">
        <table className="tabla-unidades tabla-stats">
          <thead>
            <tr>
              <th>Unidad</th>
              <th>Acierto</th>
              <th>Vistas</th>
              <th>Caja</th>
              <th>Evolución</th>
            </tr>
          </thead>
          <tbody>
            {porUnidad.map((u) => (
              <tr key={u.unidad}>
                <td>
                  <span className="ut">UT {u.unidad}</span> {programa.unidades.find((x) => x.numero === u.unidad)!.nombreCuadro}
                </td>
                <td>
                  {u.porcentaje === null ? '—' : `${u.porcentaje}%`}
                  {u.respuestas > 0 && <span className="limite"> ({u.respuestas})</span>}
                </td>
                <td>
                  {u.vistas}/{u.enBanco}
                </td>
                <td>{u.enCaja || '—'}</td>
                <td>
                  <Sparkline puntos={u.evolucion} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="nota">Acierto: % sobre todas tus respuestas (entre paréntesis, cuántas). Evolución: % de acierto por semana.</p>

      <h2>Sesiones</h2>
      {sesiones.length === 0 ? (
        <p className="sub">Todavía no has terminado ninguna sesión.</p>
      ) : (
        <ul className="lista-sesiones">
          {[...sesiones]
            .reverse()
            .slice(0, MAX_SESIONES)
            .map((s) => (
              <li key={s.id} className={s.tipo === 'simulacro' ? (s.resultado.apto ? 'apto' : 'no-apto') : ''}>
                <span className="fecha">{fechaHora(s.fin)}</span>
                <span className="tipo">{nombreSesion(s)}</span>
                <span className="res">{resultadoSesion(s)}</span>
              </li>
            ))}
        </ul>
      )}

      <h2>Copia de seguridad</h2>
      <p className="nota">El historial solo vive en este dispositivo. Descarga una copia para pasarlo a otro o no perderlo.</p>
      <div className="fila-botones">
        <button className="boton" onClick={() => void descargar()}>
          Exportar historial
        </button>
        <button className="boton" onClick={() => fichero.current?.click()}>
          Importar copia…
        </button>
        <input ref={fichero} type="file" accept="application/json,.json" hidden onChange={(e) => void cargar(e.target.files?.[0])} />
      </div>
      {mensaje && (
        <p className={mensaje.error ? 'aviso error' : 'aviso'} role="status">
          {mensaje.texto}
        </p>
      )}
      <div className="zona-peligro">
        {confirmarBorrado ? (
          <>
            <p>Se borrarán todas tus respuestas, sesiones y la caja de fallos de este dispositivo. No se puede deshacer.</p>
            <div className="fila-botones">
              <button className="boton peligro" onClick={() => void borrar()}>
                Sí, borrar todo
              </button>
              <button className="boton" onClick={() => setConfirmarBorrado(false)}>
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <button className="boton enlace" onClick={() => setConfirmarBorrado(true)}>
            Borrar historial…
          </button>
        )}
      </div>
    </main>
  )
}
