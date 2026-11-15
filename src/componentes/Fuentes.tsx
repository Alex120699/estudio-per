import { examenes, type FuenteRef, type Pregunta } from '../tipos/preguntas'

const VISIBLES = 2

function Enlace({ f }: { f: FuenteRef }) {
  const ex = examenes[f.examen]
  return (
    <>
      <a href={ex.url} target="_blank" rel="noopener noreferrer">
        {ex.comunidad} {ex.convocatoria} mod. {ex.modelo}, nº {f.numero}
      </a>
      {f.correccion && ' (respuesta según errata oficial)'}
    </>
  )
}

/** Fuentes oficiales de una pregunta, con enlace al PDF (las más recientes primero). */
export default function Fuentes({ pregunta }: { pregunta: Pregunta }) {
  const fuentes = [...pregunta.fuentes].reverse()
  const resto = fuentes.slice(VISIBLES)
  return (
    <div className="fuentes">
      {pregunta.revision && (
        <p className="nota-revision">
          <strong>Ojo:</strong> las plantillas oficiales no coinciden en esta pregunta. {pregunta.revision}
        </p>
      )}
      <p>
        Fuente:{' '}
        {fuentes.slice(0, VISIBLES).map((f, k) => (
          <span key={k}>
            {k > 0 && ' · '}
            <Enlace f={f} />
          </span>
        ))}
      </p>
      {resto.length > 0 && (
        <details>
          <summary>
            y {resto.length} {resto.length === 1 ? 'examen más' : 'exámenes más'}
          </summary>
          <ul>
            {resto.map((f, k) => (
              <li key={k}>
                <Enlace f={f} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
