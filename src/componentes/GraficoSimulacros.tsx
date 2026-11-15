import { useEffect, useRef, useState } from 'react'
import type { RegistroSesion } from '../logica/historial'

interface Props {
  sesiones: RegistroSesion[]
  /** Aciertos mínimos para aprobar (línea de corte). */
  corte: number
  total: number
}

const ALTO = 160
const MARGEN = { arriba: 12, abajo: 22, izq: 28, der: 8 }
const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

/**
 * Aciertos de cada simulacro (barras, el más antiguo a la izquierda) con la línea de aprobado.
 * El estado nunca va solo en el color: «no apto» lleva trama rayada y ✗, «apto» lleva ✓.
 */
export default function GraficoSimulacros({ sesiones, corte, total }: Props) {
  const [activa, setActiva] = useState<number | null>(null)
  const [disponible, setDisponible] = useState(320)
  const caja = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = caja.current
    if (!el) return
    const obs = new ResizeObserver(([e]) => setDisponible(Math.floor(e.contentRect.width)))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  const n = sesiones.length
  // Ocupa el ancho disponible; si hay muchas barras, se desplaza en horizontal.
  const ancho = Math.max(disponible, MARGEN.izq + MARGEN.der + n * 16)
  const zona = ancho - MARGEN.izq - MARGEN.der
  const paso = zona / Math.max(n, 1)
  const barra = Math.min(24, paso - 4)
  const y = (v: number) => MARGEN.arriba + (1 - v / total) * (ALTO - MARGEN.arriba - MARGEN.abajo)
  const base = y(0)
  const s = activa !== null ? sesiones[activa] : null

  return (
    <figure className="grafico">
      <div className="grafico-scroll" ref={caja}>
        <svg viewBox={`0 0 ${ancho} ${ALTO}`} width={ancho} height={ALTO} role="img" aria-label={`Aciertos de los últimos ${n} simulacros`}>
          <defs>
            <pattern id="trama-no-apto" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" className="trama-fondo" />
              <line x1="0" y1="0" x2="0" y2="5" className="trama-linea" strokeWidth="2.5" />
            </pattern>
          </defs>
          {[0, corte, total].map((v) => (
            <g key={v}>
              <line x1={MARGEN.izq} x2={ancho - MARGEN.der} y1={y(v)} y2={y(v)} className={v === corte ? 'linea-corte' : 'rejilla'} />
              <text x={MARGEN.izq - 4} y={y(v) + 4} className="eje" textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          {sesiones.map((ses, i) => {
            const x = MARGEN.izq + i * paso + (paso - barra) / 2
            const top = y(ses.resultado.aciertos)
            const apto = ses.resultado.apto
            return (
              <g
                key={ses.id}
                onMouseEnter={() => setActiva(i)}
                onMouseLeave={() => setActiva(null)}
                onClick={() => setActiva(activa === i ? null : i)}
                className="marca"
              >
                {/* zona de toque más grande que la barra */}
                <rect x={MARGEN.izq + i * paso} y={MARGEN.arriba} width={paso} height={base - MARGEN.arriba} fill="transparent" />
                <path
                  d={`M${x},${base} V${top + 4} q0,-4 4,-4 h${barra - 8} q4,0 4,4 V${base} Z`}
                  className={apto ? 'barra-apto' : 'barra-no-apto'}
                  fill={apto ? undefined : 'url(#trama-no-apto)'}
                  opacity={activa === null || activa === i ? 1 : 0.45}
                />
                <text x={x + barra / 2} y={top - 3} textAnchor="middle" className={apto ? 'icono-apto' : 'icono-no-apto'}>
                  {apto ? '✓' : '✗'}
                </text>
              </g>
            )
          })}
          {n > 0 && (
            <>
              <text x={MARGEN.izq} y={ALTO - 6} className="eje">
                {fecha(sesiones[0].fin)}
              </text>
              <text x={ancho - MARGEN.der} y={ALTO - 6} textAnchor="end" className="eje">
                {fecha(sesiones[n - 1].fin)}
              </text>
            </>
          )}
        </svg>
      </div>
      <figcaption className="leyenda">
        {s ? (
          <span>
            <strong>{fecha(s.fin)}</strong> · {s.resultado.aciertos}/{s.resultado.preguntas} aciertos · {s.resultado.apto ? '✓ apto' : '✗ no apto'}
            {s.resultado.motivos?.length ? ` · ${s.resultado.motivos.join(' ')}` : ''}
          </span>
        ) : (
          <span>
            <span className="muestra apto" /> ✓ apto <span className="muestra no-apto" /> ✗ no apto <span className="muestra corte" /> aprobado ≥ {corte} · toca una barra para ver el detalle
          </span>
        )}
      </figcaption>
    </figure>
  )
}
