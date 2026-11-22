import { explicacionDe } from '../datos/explicaciones'
import { laminasDe } from '../datos/laminas'
import { programa } from '../tipos/programa'
import type { Pregunta } from '../tipos/preguntas'
import Lamina from './Lamina'
import PasoAPaso from './PasoAPaso'

interface Props {
  pregunta: Pregunta
  /** Mostrar el enlace a los apuntes aunque no haya explicación (p. ej., al fallar). */
  enlaceSiempre: boolean
  onApuntes: (unidad: number, seccion?: string) => void
}

/** «Por qué» de la respuesta correcta y enlace al apartado de los apuntes. */
export default function Explicacion({ pregunta: p, enlaceSiempre, onApuntes }: Props) {
  const e = explicacionDe(p.id)
  const unidad = programa.unidades.find((u) => u.numero === p.unidad)!
  const apartado = e && unidad.apartados.find((a) => a.codigo === e.apartado)

  return (
    <>
      {e && (
        <div className="explicacion">
          <p>
            <strong>Por qué:</strong> {e.texto}
          </p>
          {e.duda && (
            <p className="nota-revision">
              <strong>Ojo:</strong> {e.duda}
            </p>
          )}
          <PasoAPaso id={p.id} letraCorrecta={'abcd'[p.correcta]} />
          {laminasDe(p.id).map((l) => (
            <Lamina key={l.id} lamina={l} />
          ))}
          <p className="aviso-explicacion">Explicación de elaboración propia, no oficial.</p>
        </div>
      )}
      {(e || enlaceSiempre) && (
        <button className="enlace-apuntes" onClick={() => onApuntes(p.unidad, apartado?.codigo)}>
          {apartado
            ? `Repasar en los apuntes: ${apartado.codigo} ${apartado.titulo} →`
            : `Repasar en los apuntes: UT ${p.unidad} · ${unidad.nombreCuadro} →`}
        </button>
      )}
    </>
  )
}
