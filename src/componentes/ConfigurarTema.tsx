import { useState } from 'react'
import { candidatasTema, type ContextoHistorial, type FiltroTema, type OpcionesTema } from '../logica/seleccion'
import type { Modo } from '../logica/sesion'
import { preguntas } from '../tipos/preguntas'
import { programa } from '../tipos/programa'

interface Props {
  contexto: ContextoHistorial
  onEmpezar: (opciones: OpcionesTema, modo: Modo) => void
  onVolver: () => void
}

const CANTIDADES = [10, 20, 'todas'] as const
const FILTROS: { valor: FiltroTema; texto: string }[] = [
  { valor: 'aleatorias', texto: 'Aleatorias' },
  { valor: 'noVistas', texto: 'No vistas' },
  { valor: 'falladas', texto: 'Falladas' },
]

export default function ConfigurarTema({ contexto, onEmpezar, onVolver }: Props) {
  const [unidades, setUnidades] = useState<number[]>([])
  const [cantidad, setCantidad] = useState<OpcionesTema['cantidad']>(10)
  const [modo, setModo] = useState<Modo>('estudio')
  const [excluirCarta, setExcluirCarta] = useState(false)
  const [filtro, setFiltro] = useState<FiltroTema>('aleatorias')

  const disponibles = candidatasTema(preguntas, { unidades, cantidad, excluirCarta, filtro }, contexto).length
  const alternar = (n: number) => setUnidades((us) => (us.includes(n) ? us.filter((x) => x !== n) : [...us, n].sort((a, b) => a - b)))
  const todas = programa.unidades.map((u) => u.numero)

  return (
    <main className="contenedor">
      <button className="volver" onClick={onVolver}>
        ← Inicio
      </button>
      <h1>Test por tema</h1>

      <fieldset className="grupo">
        <legend>Unidades</legend>
        <div className="fila-botones pequeña">
          <button className="boton" onClick={() => setUnidades(todas.filter((n) => n <= 6))}>
            UT 1–6 (PNB)
          </button>
          <button className="boton" onClick={() => setUnidades(todas.filter((n) => n >= 7))}>
            UT 7–11 (PER)
          </button>
          <button className="boton" onClick={() => setUnidades(unidades.length === todas.length ? [] : todas)}>
            {unidades.length === todas.length ? 'Ninguna' : 'Todas'}
          </button>
        </div>
        <div className="lista-check">
          {programa.unidades.map((u) => (
            <label key={u.numero} className={unidades.includes(u.numero) ? 'check activo' : 'check'}>
              <input type="checkbox" checked={unidades.includes(u.numero)} onChange={() => alternar(u.numero)} />
              <span className="ut">UT {u.numero}</span> {u.nombreCuadro}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grupo">
        <legend>Preguntas</legend>
        <div className="segmentado">
          {CANTIDADES.map((c) => (
            <button key={c} className={cantidad === c ? 'activo' : ''} onClick={() => setCantidad(c)}>
              {c === 'todas' ? 'Todas' : c}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="grupo">
        <legend>Qué preguntas</legend>
        <div className="segmentado">
          {FILTROS.map((f) => (
            <button key={f.valor} className={filtro === f.valor ? 'activo' : ''} onClick={() => setFiltro(f.valor)}>
              {f.texto}
            </button>
          ))}
        </div>
        {filtro === 'falladas' && <p className="nota">Las que están en tu caja de fallos ({contexto.enCaja.size} en total).</p>}
        {filtro === 'noVistas' && <p className="nota">Las que no has respondido nunca.</p>}
      </fieldset>

      <fieldset className="grupo">
        <legend>Corrección</legend>
        <div className="segmentado">
          <button className={modo === 'estudio' ? 'activo' : ''} onClick={() => setModo('estudio')}>
            Al responder
          </button>
          <button className={modo === 'test' ? 'activo' : ''} onClick={() => setModo('test')}>
            Al final
          </button>
        </div>
      </fieldset>

      {unidades.includes(11) && (
        <label className="check">
          <input type="checkbox" checked={excluirCarta} onChange={(e) => setExcluirCarta(e.target.checked)} />
          Excluir las preguntas que necesitan la carta náutica (UT 11)
        </label>
      )}

      <button
        className="boton primario ancho"
        disabled={disponibles === 0}
        onClick={() => onEmpezar({ unidades, cantidad, excluirCarta, filtro }, modo)}
      >
        {unidades.length === 0
          ? 'Elige al menos una unidad'
          : disponibles === 0
            ? 'No hay preguntas con ese filtro'
            : `Empezar · ${cantidad === 'todas' ? disponibles : Math.min(cantidad, disponibles)} preguntas`}
      </button>
    </main>
  )
}
