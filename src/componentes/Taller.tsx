import { useEffect, useMemo, useState } from 'react'
import faros from '../../data/faros.json'
import { todasLasLaminas } from '../datos/laminas'
import { cargarProgreso, sumarEjercicio, type ProgresoLeccion } from '../datos/tallerProgreso'
import { azarFijo, esCorrecta, lecciones, leerRespuesta, type Ejercicio, type Leccion, type PuntoCarta } from '../logica/taller'
import Lamina from './Lamina'

const LECCIONES = lecciones((faros as { puntos: Record<string, PuntoCarta> }).puntos)

/** Sección «Taller de carta»: lecciones con teoría, ejemplo resuelto y ejercicios guiados. */
export default function Taller({ onVolver }: { onVolver: () => void }) {
  const [leccion, setLeccion] = useState<Leccion | null>(null)
  const [practicando, setPracticando] = useState(false)
  const [progreso, setProgreso] = useState<Record<string, ProgresoLeccion>>(cargarProgreso)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [leccion, practicando])

  if (leccion && practicando)
    return (
      <Practica
        leccion={leccion}
        onTerminado={(limpio) => setProgreso(sumarEjercicio(leccion.id, limpio))}
        onVolver={() => setPracticando(false)}
      />
    )

  if (leccion) return <VistaLeccion leccion={leccion} onEmpezar={() => setPracticando(true)} onVolver={() => setLeccion(null)} />

  return (
    <main className="contenedor">
      <button className="volver" onClick={onVolver}>
        ← Inicio
      </button>
      <h1>Taller de carta</h1>
      <p className="sub">Ejercicios de carta poco a poco: cada lección explica una cosa, la resuelve con un ejemplo y te deja practicar con ejercicios nuevos cada vez.</p>
      <div className="menu">
        {LECCIONES.map((l) => {
          const p = progreso[l.id]
          return (
            <button key={l.id} className="tarjeta-accion" onClick={() => setLeccion(l)}>
              <span className="titulo">
                {l.numero}. {l.titulo}
              </span>
              <span className="detalle">{l.resumen}</span>
              {p && (
                <span className="detalle progreso-taller">
                  {p.hechos} {p.hechos === 1 ? 'ejercicio' : 'ejercicios'} · {p.limpios} sin fallos
                </span>
              )}
            </button>
          )
        })}
      </div>
      <p className="nota">Próximamente: situación por demoras y por distancias, estima, rumbo y hora de llegada, pasar a una distancia de un faro y ejercicios completos de examen.</p>
    </main>
  )
}

function VistaLeccion({ leccion: l, onEmpezar, onVolver }: { leccion: Leccion; onEmpezar: () => void; onVolver: () => void }) {
  const ejemplo = useMemo(() => l.generar(azarFijo(l.numero * 31)), [l])
  const laminas = todasLasLaminas().filter((x) => l.laminas.includes(x.id))
  return (
    <main className="contenedor">
      <button className="volver" onClick={onVolver}>
        ← Taller de carta
      </button>
      <h1>
        {l.numero}. {l.titulo}
      </h1>
      <section className="teoria-taller">
        {l.teoria.map((t, i) => (
          <p key={i}>{t}</p>
        ))}
        {laminas.map((x) => (
          <Lamina key={x.id} lamina={x} />
        ))}
      </section>
      <details className="ejemplo-taller">
        <summary>Ejemplo resuelto</summary>
        <p className="enunciado-taller">{ejemplo.enunciado}</p>
        <ol>
          {ejemplo.pasos.map((p, i) => (
            <li key={i}>
              {p.pregunta}
              <span className="cuenta">{p.solucion}</span>
            </li>
          ))}
        </ol>
      </details>
      <button className="boton primario ancho" onClick={onEmpezar}>
        Empezar ejercicios
      </button>
    </main>
  )
}

function Practica({ leccion, onTerminado, onVolver }: { leccion: Leccion; onTerminado: (limpio: boolean) => void; onVolver: () => void }) {
  const [n, setN] = useState(0)
  const [ejercicio, setEjercicio] = useState(() => leccion.generar(Math.random))
  const otro = () => {
    setEjercicio(leccion.generar(Math.random))
    setN(n + 1)
    window.scrollTo(0, 0)
  }
  return (
    <main className="contenedor">
      <button className="volver" onClick={onVolver}>
        ← {leccion.titulo}
      </button>
      <EjercicioGuiado key={n} ejercicio={ejercicio} onTerminado={onTerminado} onOtro={otro} />
    </main>
  )
}

interface Hecho {
  /** «bien» a la primera, «segunda» bien tras la pista, «mal» fallado dos veces. */
  estado: 'bien' | 'segunda' | 'mal'
  respuesta: string
}

const ETIQUETA: Record<Hecho['estado'], string> = { bien: '✓ Tu respuesta', segunda: '✓ Bien al segundo intento', mal: '✗ Tu respuesta' }

function EjercicioGuiado({ ejercicio: e, onTerminado, onOtro }: { ejercicio: Ejercicio; onTerminado: (limpio: boolean) => void; onOtro: () => void }) {
  const [hechos, setHechos] = useState<Hecho[]>([])
  const [texto, setTexto] = useState('')
  const [fallos, setFallos] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)
  const i = hechos.length
  const paso = e.pasos[i]
  const fin = i >= e.pasos.length

  function cerrarPaso(h: Hecho) {
    const nuevos = [...hechos, h]
    setHechos(nuevos)
    setTexto('')
    setFallos(0)
    setAviso(null)
    if (nuevos.length === e.pasos.length) onTerminado(nuevos.every((x) => x.estado === 'bien'))
  }

  function comprobar(valor: number | null, mostrado: string) {
    if (!paso) return
    if (valor === null) {
      setAviso('Escribe un número (puedes usar coma, signo o NE/NW).')
      return
    }
    if (esCorrecta(paso, valor)) cerrarPaso({ estado: fallos === 0 ? 'bien' : 'segunda', respuesta: mostrado })
    else if (fallos === 0) {
      setFallos(1)
      setAviso(`No es correcto. Pista: ${paso.pista}`)
    } else cerrarPaso({ estado: 'mal', respuesta: mostrado })
  }

  const limpio = fin && hechos.every((h) => h.estado === 'bien')
  const aRepasar = hechos.filter((h) => h.estado !== 'bien').length

  return (
    <section className="ejercicio-taller">
      {e.carta && <p className="aviso">Necesitas la carta del Estrecho, regla, cartabón y compás.</p>}
      <p className="enunciado-taller">{e.enunciado}</p>
      <ol className="pasos-taller">
        {hechos.map((h, k) => (
          <li key={k} className={h.estado}>
            <span className="pregunta-paso">{e.pasos[k].pregunta}</span>
            <span className="tu-respuesta">
              {ETIQUETA[h.estado]}: {h.respuesta}
            </span>
            <span className="cuenta">{e.pasos[k].solucion}</span>
          </li>
        ))}
        {paso && (
          <li className="actual">
            <span className="pregunta-paso">{paso.pregunta}</span>
            {paso.tipo === 'banda' ? (
              <div className="fila-botones">
                <button className="boton" onClick={() => comprobar(-1, 'babor')}>
                  Babor
                </button>
                <button className="boton" onClick={() => comprobar(1, 'estribor')}>
                  Estribor
                </button>
              </div>
            ) : (
              <form
                className="respuesta-taller"
                onSubmit={(ev) => {
                  ev.preventDefault()
                  comprobar(leerRespuesta(texto), texto.trim())
                }}
              >
                <input
                  value={texto}
                  onChange={(ev) => setTexto(ev.target.value)}
                  inputMode={paso.clase === 'signo' ? 'text' : 'decimal'}
                  placeholder={paso.clase === 'signo' ? 'p. ej. −3 o 3 NW' : paso.clase === 'rumbo' ? 'grados, p. ej. 045' : 'número'}
                  aria-label={paso.pregunta}
                  autoComplete="off"
                  autoFocus
                />
                <button className="boton primario" type="submit" disabled={!texto.trim()}>
                  Comprobar
                </button>
              </form>
            )}
            {aviso && <p className="aviso-paso">{aviso}</p>}
          </li>
        )}
      </ol>
      {fin && (
        <div className={limpio ? 'cierre-taller bien' : 'cierre-taller mal'}>
          <p>{limpio ? '¡Todo bien a la primera!' : `Terminado con ${aRepasar} ${aRepasar === 1 ? 'paso' : 'pasos'} por repasar.`}</p>
          <button className="boton primario ancho" onClick={onOtro}>
            Otro ejercicio
          </button>
        </div>
      )}
    </section>
  )
}
