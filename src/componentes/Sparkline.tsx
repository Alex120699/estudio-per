interface Props {
  puntos: { semana: string; porcentaje: number; respuestas: number }[]
}

const ANCHO = 64
const ALTO = 26

/** Evolución semanal del % de acierto de una unidad (0–100 %). Una sola serie, un solo tono. */
export default function Sparkline({ puntos }: Props) {
  if (puntos.length < 2) return <span className="nota">{puntos.length ? `${puntos[0].porcentaje}%` : '—'}</span>
  const x = (i: number) => 3 + (i / (puntos.length - 1)) * (ANCHO - 6)
  const y = (p: number) => 3 + (1 - p / 100) * (ALTO - 6)
  const d = puntos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.porcentaje).toFixed(1)}`).join(' ')
  const ultimo = puntos[puntos.length - 1]
  const resumen = puntos.map((p) => `semana del ${p.semana}: ${p.porcentaje}% (${p.respuestas} respuestas)`).join('; ')
  return (
    <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} width={ANCHO} height={ALTO} role="img" aria-label={`Evolución: ${resumen}`} className="sparkline">
      <title>{resumen}</title>
      <path d={d} className="spark-linea" />
      <circle cx={x(puntos.length - 1)} cy={y(ultimo.porcentaje)} r="3" className="spark-punto" />
    </svg>
  )
}
