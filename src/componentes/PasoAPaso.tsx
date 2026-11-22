import { useState } from 'react'
import { resolucionDe } from '../datos/resoluciones'

/** Resolución paso a paso de un ejercicio de carta, plegada hasta que se pide. */
export default function PasoAPaso({ id, letraCorrecta }: { id: string; letraCorrecta: string }) {
  const [abierta, setAbierta] = useState(false)
  const r = resolucionDe(id)
  if (!r || r.error) return null

  return (
    <div className="paso-a-paso">
      <button className="boton-paso" aria-expanded={abierta} onClick={() => setAbierta(!abierta)}>
        {abierta ? 'Ocultar la resolución' : 'Ver la resolución paso a paso'}
      </button>
      {abierta && (
        <>
          <ol>
            {r.lineas.map((l, i) => (
              <li key={i} className={l.final ? 'final' : undefined}>
                {l.texto}
                {l.nota && <span className="nota-paso">{l.nota}</span>}
                {l.carta && (
                  <span className="carta-paso">
                    <strong>En la carta:</strong> {l.carta}
                  </span>
                )}
              </li>
            ))}
          </ol>
          <p className="aviso-explicacion">
            Calculado con las posiciones de los faros de la carta 105. Medido a mano sobre la carta puede salir 1–2º o unas décimas de milla distinto: la respuesta
            oficial es la {letraCorrecta}).
          </p>
        </>
      )}
    </div>
  )
}
