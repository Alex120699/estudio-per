import { programa } from './tipos/programa'
import { preguntas } from './tipos/preguntas'

const enBanco = (unidad: number) => preguntas.filter((p) => p.unidad === unidad).length

// Portada provisional (Fase 0): muestra el programa oficial cargado desde data/programa.json.
export default function App() {
  const { examen, unidades, fuente } = programa
  return (
    <main className="contenedor">
      <header>
        <h1>Estudio PER</h1>
        <p className="sub">
          Examen completo: {examen.completo.preguntas} preguntas · aprobado con {examen.completo.minAciertos} aciertos
        </p>
        <p className="sub">Banco: {preguntas.length} preguntas oficiales</p>
      </header>

      <ol className="unidades">
        {unidades.map((u) => (
          <li key={u.numero}>
            <details>
              <summary>
                <span className="ut">UT {u.numero}</span>
                <span className="nombre">{u.nombre}</span>
                <span className="n">
                  {u.preguntas} en examen · {enBanco(u.numero)} en banco
                </span>
              </summary>
              <ul>
                {u.apartados.map((a) => (
                  <li key={a.codigo}>
                    {a.codigo} {a.titulo}
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ol>

      <footer>
        Programa: {fuente.apartado}, {fuente.id}. Consolidado del {fuente.ultimaActualizacionConsolidado}.
      </footer>
    </main>
  )
}
