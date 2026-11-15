import type { Pregunta } from '../tipos/preguntas'

/** Figura del examen original que acompaña al enunciado, si la hay. */
export default function Figura({ pregunta }: { pregunta: Pregunta }) {
  if (!pregunta.imagen) return null
  return (
    <figure className="figura-pregunta">
      <img src={import.meta.env.BASE_URL + pregunta.imagen} alt="Figura de la pregunta en el examen original" />
    </figure>
  )
}
