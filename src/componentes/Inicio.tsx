import type { Historial } from '../datos/db'
import { estoyListo } from '../logica/historial'
import { tituloSesion, type Sesion } from '../logica/sesion'
import { programa } from '../tipos/programa'
import { preguntas } from '../tipos/preguntas'

interface Props {
  enCurso: Sesion | null
  historial: Historial
  /** Preguntas de la caja de fallos que tocan hoy. */
  pendientes: number
  errorHistorial: string | null
  onContinuar: () => void
  onDescartar: () => void
  onSimulacro: (tipo: 'completo' | 'complementario') => void
  onTema: () => void
  onRepaso: () => void
  onEstadisticas: () => void
  onApuntes: () => void
  onTaller: () => void
}

const enBanco = (unidad: number) => preguntas.filter((p) => p.unidad === unidad).length

function describirSesion(s: Sesion) {
  const respondidas = s.respuestas.filter((r) => r !== null).length
  return `${tituloSesion(s)}: ${respondidas} de ${s.preguntaIds.length} respondidas`
}

export default function Inicio(props: Props) {
  const { enCurso, historial, pendientes, errorHistorial } = props
  const { examen, unidades, fuente } = programa
  const listo = estoyListo(historial.sesiones)
  const enCaja = historial.caja.size

  return (
    <main className="contenedor">
      <header>
        <h1>Estudio PER</h1>
        <p className="sub">Sin cronómetro · {preguntas.length} preguntas de exámenes oficiales</p>
      </header>

      {errorHistorial && (
        <p className="aviso">No se puede guardar el historial en este navegador ({errorHistorial}). Puedes practicar, pero no se guardarán tus resultados.</p>
      )}

      {enCurso && (
        <section className="aviso-curso">
          <p>
            <strong>Tienes una sesión a medias.</strong>
            <br />
            {describirSesion(enCurso)}
          </p>
          <p className="nota">Si empiezas otra, esta se descarta.</p>
          <div className="fila-botones">
            <button className="boton primario" onClick={props.onContinuar}>
              Continuar
            </button>
            <button className="boton" onClick={props.onDescartar}>
              Descartar
            </button>
          </div>
        </section>
      )}

      {listo.considerados > 0 && (
        <button className="listo" onClick={props.onEstadisticas}>
          <span className="etiqueta">¿Estoy listo?</span>
          <span className="cifra">{listo.porcentaje}%</span>
          <span className="detalle">
            {listo.aprobados} de los últimos {listo.considerados} simulacros aprobados
          </span>
        </button>
      )}

      <nav className="menu">
        {enCaja > 0 &&
          (pendientes > 0 ? (
            <button className="tarjeta-accion destacada" onClick={props.onRepaso}>
              <span className="titulo">Repasar fallos ({pendientes} {pendientes === 1 ? 'pendiente' : 'pendientes'})</span>
              <span className="detalle">Cada pregunta sale de la caja al acertarla 2 veces seguidas en días distintos</span>
            </button>
          ) : (
            <p className="tarjeta-accion hecho">
              <span className="titulo">Repaso de hoy hecho</span>
              <span className="detalle">
                {enCaja} {enCaja === 1 ? 'pregunta sigue' : 'preguntas siguen'} en la caja de fallos: vuelve mañana para el segundo acierto.
              </span>
            </p>
          ))}
        <button className="tarjeta-accion" onClick={() => props.onSimulacro('completo')}>
          <span className="titulo">Simulacro PER</span>
          <span className="detalle">
            {examen.completo.preguntas} preguntas · apto con {examen.completo.minAciertos} aciertos y sin pasar el máximo de errores en
            Balizamiento, Reglamento y Carta
          </span>
        </button>
        <button className="tarjeta-accion" onClick={() => props.onSimulacro('complementario')}>
          <span className="titulo">Simulacro complementario</span>
          <span className="detalle">
            Para quien ya tiene el PNB: UT 7–11, {examen.complementarioPNB.preguntas} preguntas · apto con{' '}
            {examen.complementarioPNB.minAciertos} aciertos
          </span>
        </button>
        <button className="tarjeta-accion" onClick={props.onTema}>
          <span className="titulo">Test por tema</span>
          <span className="detalle">Elige unidades y número de preguntas · solo no vistas o solo falladas</span>
        </button>
        <button className="tarjeta-accion" onClick={props.onTaller}>
          <span className="titulo">Taller de carta</span>
          <span className="detalle">Ejercicios de carta paso a paso, de menos a más · corrección al momento</span>
        </button>
        <button className="tarjeta-accion" onClick={props.onApuntes}>
          <span className="titulo">Apuntes</span>
          <span className="detalle">Teoría de las 11 unidades, ordenada por el programa oficial</span>
        </button>
        <button className="tarjeta-accion" onClick={props.onEstadisticas}>
          <span className="titulo">Estadísticas e historial</span>
          <span className="detalle">
            {historial.sesiones.length
              ? `${historial.sesiones.length} ${historial.sesiones.length === 1 ? 'sesión' : 'sesiones'} · ${historial.respuestas.length} respuestas`
              : 'Aún no hay sesiones'}{' '}
            · copia de seguridad
          </span>
        </button>
      </nav>

      <details className="programa">
        <summary>Programa oficial y banco de preguntas</summary>
        <ol className="unidades">
          {unidades.map((u) => (
            <li key={u.numero}>
              <details>
                <summary>
                  <span className="ut">UT {u.numero}</span>
                  <span className="nombre">{u.nombre}</span>
                  <span className="n">
                    {u.preguntas} en examen · {enBanco(u.numero)} en banco
                  </span>
                </summary>
                <ul>
                  {u.apartados.map((a) => (
                    <li key={a.codigo}>
                      {a.codigo} {a.titulo}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ol>
        <p className="nota">
          {fuente.apartado}, {fuente.id}. Consolidado del {fuente.ultimaActualizacionConsolidado}.
        </p>
      </details>
    </main>
  )
}
