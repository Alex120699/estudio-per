import { useState } from 'react'
import { ACIERTOS_PARA_SALIR, type EntradaCaja } from '../logica/historial'
import type { ResumenSesion, Sesion } from '../logica/sesion'
import type { Pregunta } from '../tipos/preguntas'
import { programa } from '../tipos/programa'
import Figura from './Figura'
import Fuentes from './Fuentes'

interface Props {
  sesion: Sesion
  preguntas: Pregunta[]
  resumen: ResumenSesion
  caja: ReadonlyMap<string, EntradaCaja>
  onInicio: () => void
  onRepetir: () => void
  onApuntes: (unidad: number) => void
}

const LETRAS = ['a', 'b', 'c', 'd']
const unidad = (n: number) => programa.unidades.find((u) => u.numero === n)!

function estadoCaja(e: EntradaCaja | undefined, repaso: boolean) {
  if (e) return `En la caja de fallos · ${e.aciertosSeguidos}/${ACIERTOS_PARA_SALIR} aciertos seguidos en días distintos`
  return repaso ? 'Ha salido de la caja de fallos ✓' : null
}

export default function Resultado({ sesion, preguntas, resumen, caja, onInicio, onRepetir, onApuntes }: Props) {
  const repaso = sesion.tipo === 'repaso'
  const salieron = repaso ? preguntas.filter((p) => !caja.has(p.id)).length : 0
  const [soloFallos, setSoloFallos] = useState(true)
  const sim = resumen.simulacro
  const filas = preguntas.map((p, i) => ({ p, i, elegida: sesion.respuestas[i] })).filter((f) => !soloFallos || f.elegida !== f.p.correcta)

  // Tabla por unidad: en simulacros viene de la corrección oficial; en tests por tema se calcula aquí.
  const porUnidad =
    sim?.porUnidad ??
    [...new Set(preguntas.map((p) => p.unidad))]
      .sort((a, b) => a - b)
      .map((u) => {
        const idx = preguntas.flatMap((p, i) => (p.unidad === u ? [i] : []))
        const aciertos = idx.filter((i) => sesion.respuestas[i] === preguntas[i].correcta).length
        return { unidad: u, preguntas: idx.length, aciertos, errores: idx.length - aciertos, minAciertos: null, superaLimite: false }
      })

  return (
    <main className="contenedor">
      <button className="volver" onClick={onInicio}>
        ← Inicio
      </button>

      {sim ? (
        <section className={sim.apto ? 'veredicto apto' : 'veredicto no-apto'}>
          <p className="grande">{sim.apto ? 'APTO' : 'NO APTO'}</p>
          <p>
            {sim.aciertos} de {sim.preguntas} aciertos (mínimo {sim.minAciertos})
            {sim.enBlanco > 0 && ` · ${sim.enBlanco} en blanco`}
          </p>
          {sim.motivos.length > 0 && (
            <ul className="motivos">
              {sim.motivos.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
          {!sim.apto && sim.aptoPNB && (
            <p className="nota-pnb">Con estas respuestas aprobarías el PNB (UT 1–6): se te reconocería durante dos convocatorias.</p>
          )}
        </section>
      ) : (
        <section className="veredicto neutro">
          <p className="grande">
            {resumen.aciertos}/{resumen.preguntas}
          </p>
          <p>
            {Math.round((resumen.aciertos / resumen.preguntas) * 100)}% de aciertos
            {resumen.enBlanco > 0 && ` · ${resumen.enBlanco} en blanco`}
          </p>
          {repaso && (
            <p>
              {salieron} de {preguntas.length} {salieron === 1 ? 'ha salido' : 'han salido'} de la caja de fallos
            </p>
          )}
        </section>
      )}

      <table className="tabla-unidades">
        <thead>
          <tr>
            <th>Unidad</th>
            <th>Aciertos</th>
            <th>Errores</th>
          </tr>
        </thead>
        <tbody>
          {porUnidad.map((u) => (
            <tr key={u.unidad} className={u.superaLimite ? 'supera' : ''}>
              <td>
                <span className="ut">UT {u.unidad}</span> {unidad(u.unidad).nombreCuadro}
              </td>
              <td>
                {u.aciertos}/{u.preguntas}
              </td>
              <td>
                {u.errores}
                {u.minAciertos !== null && <span className="limite"> (máx. {u.preguntas - u.minAciertos})</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="fila-botones">
        <button className="boton primario" onClick={onRepetir}>
          {sesion.tipo === 'simulacro' ? 'Otro simulacro' : repaso ? 'Seguir repasando' : 'Otro test igual'}
        </button>
        <button className="boton" onClick={onInicio}>
          Inicio
        </button>
      </div>

      <section className="repaso">
        <div className="cabecera-repaso">
          <h2>Repaso</h2>
          <label className="check compacto">
            <input type="checkbox" checked={soloFallos} onChange={(e) => setSoloFallos(e.target.checked)} />
            Solo fallos y en blanco
          </label>
        </div>
        {filas.length === 0 && <p className="sub">¡Sin fallos!</p>}
        <ol className="lista-repaso">
          {filas.map(({ p, i, elegida }) => (
            <li key={p.id} className={elegida === p.correcta ? 'bien' : 'mal'}>
              <p className="meta">
                {i + 1}. UT {p.unidad} · {unidad(p.unidad).nombreCuadro}
              </p>
              <p className="enunciado-repaso">{p.enunciado}</p>
              <Figura pregunta={p} />
              <ul className="opciones-repaso">
                {p.opciones.map((o, k) => (
                  <li key={k} className={k === p.correcta ? 'correcta' : k === elegida ? 'incorrecta' : ''}>
                    <span className="letra">{LETRAS[k]})</span> {o}
                    {k === p.correcta && ' ✓'}
                    {k === elegida && k !== p.correcta && ' ✗ tu respuesta'}
                  </li>
                ))}
              </ul>
              {elegida === null && <p className="en-blanco">Sin responder</p>}
              {estadoCaja(caja.get(p.id), repaso) && <p className="estado-caja">{estadoCaja(caja.get(p.id), repaso)}</p>}
              {p.explicacion && <p className="explicacion">{p.explicacion}</p>}
              {elegida !== p.correcta && (
                <button className="enlace-apuntes" onClick={() => onApuntes(p.unidad)}>
                  Repasar en los apuntes: UT {p.unidad} · {unidad(p.unidad).nombreCuadro} →
                </button>
              )}
              <Fuentes pregunta={p} />
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
