import { apunteDe } from '../datos/apuntes'
import { programa } from '../tipos/programa'

interface Props {
  /** null = índice de unidades. */
  unidad: number | null
  onElegir: (unidad: number | null) => void
  onVolver: () => void
  textoVolver: string
}

function Aviso() {
  return (
    <p className="aviso aviso-apuntes">
      Apuntes de elaboración propia, <strong>no oficiales</strong>. Para el examen manda el texto oficial (BOE, RIPA, IALA…).
    </p>
  )
}

export default function Apuntes({ unidad, onElegir, onVolver, textoVolver }: Props) {
  const apunte = unidad === null ? null : apunteDe(unidad)

  if (!apunte) {
    return (
      <main className="contenedor">
        <button className="volver" onClick={onVolver}>
          ← {textoVolver}
        </button>
        <h1>Apuntes</h1>
        <Aviso />
        <ul className="lista-apuntes">
          {programa.unidades.map((u) => (
            <li key={u.numero}>
              <button className="tarjeta-accion" onClick={() => onElegir(u.numero)}>
                <span className="titulo">
                  <span className="ut">UT {u.numero}</span> {u.nombreCuadro}
                </span>
                <span className="detalle">{u.apartados.map((a) => a.titulo).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
      </main>
    )
  }

  const n = apunte.unidad
  const anterior = programa.unidades.find((u) => u.numero === n - 1)
  const siguiente = programa.unidades.find((u) => u.numero === n + 1)
  const ir = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <main className="contenedor">
      <div className="barra-sesion">
        <button className="volver" onClick={onVolver}>
          ← {textoVolver}
        </button>
        <button className="volver" onClick={() => onElegir(null)}>
          Todas las unidades
        </button>
      </div>
      <h1>{apunte.titulo}</h1>
      <Aviso />
      {apunte.secciones.length > 1 && (
        <nav className="indice-apunte" aria-label="Índice de la unidad">
          {apunte.secciones.map((s) => (
            <button key={s.id} onClick={() => ir(s.id)}>
              <span className="codigo">{s.codigo}</span> {s.titulo}
            </button>
          ))}
        </nav>
      )}
      {/* HTML generado desde los Markdown del propio repositorio (sin HTML incrustado, lo comprueba un test). */}
      <article className="apunte" dangerouslySetInnerHTML={{ __html: apunte.html }} />
      <nav className="fila-botones nav-unidades">
        {anterior && (
          <button className="boton" onClick={() => onElegir(anterior.numero)}>
            ← UT {anterior.numero}
          </button>
        )}
        {siguiente && (
          <button className="boton" onClick={() => onElegir(siguiente.numero)}>
            UT {siguiente.numero} →
          </button>
        )}
      </nav>
    </main>
  )
}
