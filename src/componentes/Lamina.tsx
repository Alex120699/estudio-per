import type { Lamina as TLamina } from '../datos/laminas'

/** Lámina ilustrativa; al tocarla se abre a tamaño completo para poder ampliarla. */
export default function Lamina({ lamina }: { lamina: TLamina }) {
  const src = import.meta.env.BASE_URL + lamina.archivo
  return (
    <figure className="lamina">
      <a href={src} target="_blank" rel="noopener" aria-label={`${lamina.titulo} (abrir a tamaño completo)`}>
        <img src={src} alt={lamina.titulo} loading="lazy" />
      </a>
      <figcaption>{lamina.titulo} · toca para ampliar</figcaption>
    </figure>
  )
}
