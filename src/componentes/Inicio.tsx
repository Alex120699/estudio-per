import type { Sesion } from '../logica/sesion'
import { programa } from '../tipos/programa'
import { preguntas } from '../tipos/preguntas'

interface Props {
  enCurso: Sesion | null
  onContinuar: () => void
  onDescartar: () => void
  onSimulacro: (tipo: 'completo' | 'complementario') => void
  onTema: () => void
}

const enBanco = (unidad: number) => preguntas.filter((p) => p.unidad === unidad).length

function describirSesion(s: Sesion) {
  const respondidas = s.respuestas.filter((r) => r !== null).length
  const titulo =
    s.tipo === 'simulacro' ? (s.simulacro === 'complementario' ? 'Simulacro complementario' : 'Simulacro PER') : 'Test por tema'
  return `${titulo}: ${respondidas} de ${s.preguntaIds.length} respondidas`
}

export default function Inicio({ enCurso, onContinuar, onDescartar, onSimulacro, onTema }: Props) {
  const { examen, unidades, fuente } = programa
  return (
    <main className="contenedor">
      <header>
        <h1>Estudio PER</h1>
        <p className="sub">Sin cronómetro · {preguntas.length} preguntas de exámenes oficiales</p>
      </header>

      {enCurso && (
        <section className="aviso-curso">
          <p>
            <strong>Tienes una sesión a medias.</strong>
            <br />
            {describirSesion(enCurso)}
          </p>
          <p className="nota">Si empiezas otra, esta se descarta.</p>
          <div className="fila-botones">
            <button className="boton primario" onClick={onContinuar}>
              Continuar
            </button>
            <button className="boton" onClick={onDescartar}>
              Descartar
            </button>
          </div>
        </section>
      )}

      <nav className="menu">
        <button className="tarjeta-accion" onClick={() => onSimulacro('completo')}>
          <span className="titulo">Simulacro PER</span>
          <span className="detalle">
            {examen.completo.preguntas} preguntas · apto con {examen.completo.minAciertos} aciertos y sin pasar el máximo de errores en
            Balizamiento, Reglamento y Carta
          </span>
        </button>
        <button className="tarjeta-accion" onClick={() => onSimulacro('complementario')}>
          <span className="titulo">Simulacro complementario</span>
          <span className="detalle">
            Para quien ya tiene el PNB: UT 7–11, {examen.complementarioPNB.preguntas} preguntas · apto con{' '}
            {examen.complementarioPNB.minAciertos} aciertos
          </span>
        </button>
        <button className="tarjeta-accion" onClick={onTema}>
          <span className="titulo">Test por tema</span>
          <span className="detalle">Elige unidades y número de preguntas · corrección al momento o al final</span>
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
