import type { Pregunta } from '../tipos/preguntas'

/** Fuentes oficiales de una pregunta, con enlace al PDF. */
export default function Fuentes({ pregunta }: { pregunta: Pregunta }) {
  return (
    <p className="fuentes">
      Fuente:{' '}
      {pregunta.fuentes.map((f, k) => (
        <span key={k}>
          {k > 0 && ' · '}
          <a href={f.url} target="_blank" rel="noopener noreferrer">
            {f.comunidad} {f.convocatoria} mod. {f.modelo}, nº {f.numero}
          </a>
          {f.correccion && ' (respuesta según errata oficial)'}
        </span>
      ))}
    </p>
  )
}
