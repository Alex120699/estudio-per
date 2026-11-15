import { useState } from 'react'
import { tituloSesion, type Sesion } from '../logica/sesion'
import type { Pregunta } from '../tipos/preguntas'
import { programa } from '../tipos/programa'
import Figura from './Figura'
import Fuentes from './Fuentes'

interface Props {
  sesion: Sesion
  preguntas: Pregunta[]
  onResponder: (indice: number, opcion: number) => void
  onIr: (indice: number) => void
  onTerminar: () => void
  onSalir: () => void
  onApuntes: (unidad: number) => void
}

const LETRAS = ['a', 'b', 'c', 'd']
const nombreUnidad = (n: number) => programa.unidades.find((u) => u.numero === n)?.nombreCuadro ?? ''

export default function PantallaPregunta({ sesion, preguntas, onResponder, onIr, onTerminar, onSalir, onApuntes }: Props) {
  const [verIndice, setVerIndice] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const i = sesion.actual
  const p = preguntas[i]
  const elegida = sesion.respuestas[i]
  const estudio = sesion.modo === 'estudio'
  const corregida = estudio && elegida !== null
  const ultima = i === preguntas.length - 1
  const enBlanco = sesion.respuestas.filter((r) => r === null).length

  const titulo = tituloSesion(sesion)

  function claseOpcion(k: number) {
    if (corregida) {
      if (k === p.correcta) return 'opcion correcta'
      if (k === elegida) return 'opcion incorrecta'
      return 'opcion apagada'
    }
    return k === elegida ? 'opcion elegida' : 'opcion'
  }

  function pedirTerminar() {
    if (!estudio && enBlanco > 0) setConfirmar(true)
    else onTerminar()
  }

  return (
    <main className="contenedor pregunta-pantalla">
      <div className="barra-sesion">
        <button className="volver" onClick={onSalir}>
          ← Pausar
        </button>
        <span className="titulo-sesion">{titulo}</span>
        <button className="volver" onClick={() => setVerIndice((v) => !v)} aria-expanded={verIndice}>
          {i + 1}/{preguntas.length} ▾
        </button>
      </div>
      <div className="progreso" aria-hidden="true">
        <div style={{ width: `${(sesion.respuestas.filter((r) => r !== null).length / preguntas.length) * 100}%` }} />
      </div>

      {verIndice && (
        <nav className="indice" aria-label="Ir a pregunta">
          {preguntas.map((q, k) => {
            const r = sesion.respuestas[k]
            const estado = r === null ? '' : estudio ? (r === q.correcta ? 'ok' : 'mal') : 'hecha'
            return (
              <button
                key={q.id}
                className={`celda ${estado} ${k === i ? 'actual' : ''}`}
                onClick={() => {
                  onIr(k)
                  setVerIndice(false)
                }}
              >
                {k + 1}
              </button>
            )
          })}
        </nav>
      )}

      <p className="meta">
        UT {p.unidad} · {nombreUnidad(p.unidad)}
      </p>
      {p.requiereCarta && <p className="aviso">Necesitas la carta náutica del Estrecho, escuadra, cartabón y compás.</p>}
      <h2 className="enunciado">{p.enunciado}</h2>
      <Figura pregunta={p} />

      <div className="opciones" role="radiogroup">
        {p.opciones.map((o, k) => (
          <button
            key={k}
            role="radio"
            aria-checked={elegida === k}
            className={claseOpcion(k)}
            disabled={corregida}
            onClick={() => onResponder(i, k)}
          >
            <span className="letra">{LETRAS[k]}</span>
            <span>{o}</span>
            {corregida && k === p.correcta && (
              <span className="marca-estado" aria-label="correcta">
                ✓
              </span>
            )}
            {corregida && k === elegida && k !== p.correcta && (
              <span className="marca-estado" aria-label="tu respuesta, incorrecta">
                ✗
              </span>
            )}
          </button>
        ))}
      </div>

      {corregida && (
        <div className={elegida === p.correcta ? 'feedback bien' : 'feedback mal'}>
          <strong>{elegida === p.correcta ? '¡Correcto!' : `Incorrecto. La respuesta es la ${LETRAS[p.correcta]}).`}</strong>
          {p.explicacion && <p>{p.explicacion}</p>}
          {elegida !== p.correcta && (
            <button className="enlace-apuntes" onClick={() => onApuntes(p.unidad)}>
              Repasar en los apuntes: UT {p.unidad} · {nombreUnidad(p.unidad)} →
            </button>
          )}
          <Fuentes pregunta={p} />
        </div>
      )}

      {confirmar ? (
        <div className="confirmar">
          <p>
            Te quedan <strong>{enBlanco}</strong> {enBlanco === 1 ? 'pregunta' : 'preguntas'} sin responder; contarán como error.
          </p>
          <div className="fila-botones">
            <button className="boton primario" onClick={onTerminar}>
              Corregir igualmente
            </button>
            <button className="boton" onClick={() => setConfirmar(false)}>
              Seguir respondiendo
            </button>
          </div>
        </div>
      ) : (
        <div className="navegacion">
          {!estudio && (
            <button className="boton" disabled={i === 0} onClick={() => onIr(i - 1)}>
              Anterior
            </button>
          )}
          {ultima ? (
            <button className="boton primario" disabled={estudio && !corregida} onClick={pedirTerminar}>
              {estudio ? 'Ver resultado' : 'Terminar y corregir'}
            </button>
          ) : (
            <button className="boton primario" disabled={estudio && !corregida} onClick={() => onIr(i + 1)}>
              Siguiente
            </button>
          )}
        </div>
      )}
      {!ultima && !confirmar && (!estudio || sesion.respuestas.some((r) => r !== null)) && (
        <button className="enlace terminar" onClick={pedirTerminar}>
          {estudio ? 'Terminar aquí' : 'Terminar y corregir ahora'}
        </button>
      )}
    </main>
  )
}
