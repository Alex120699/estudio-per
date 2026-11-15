import { useEffect, useMemo, useState } from 'react'
import ConfigurarTema from './componentes/ConfigurarTema'
import Inicio from './componentes/Inicio'
import PantallaPregunta from './componentes/PantallaPregunta'
import Resultado from './componentes/Resultado'
import { generarSimulacro, generarTestTema, type OpcionesTema, type TipoSimulacro } from './logica/seleccion'
import {
  cargarEnCurso,
  guardarEnCurso,
  irA,
  nuevaSesion,
  preguntasDe,
  responder,
  resumir,
  terminar,
  type Modo,
  type Sesion,
} from './logica/sesion'
import { preguntas as banco } from './tipos/preguntas'
import { programa } from './tipos/programa'

type Pantalla = 'inicio' | 'tema' | 'sesion' | 'resultado'

/** Recupera la sesión guardada solo si sus preguntas siguen existiendo en el banco. */
function sesionGuardada(): Sesion | null {
  const s = cargarEnCurso()
  return s && preguntasDe(s, banco) ? s : null
}

export default function App() {
  const [pantalla, setPantalla] = useState<Pantalla>('inicio')
  const [sesion, setSesion] = useState<Sesion | null>(sesionGuardada)

  // Guarda en cada cambio: así se puede cerrar la app a mitad y continuar después.
  useEffect(() => {
    guardarEnCurso(sesion)
  }, [sesion])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pantalla, sesion?.actual])

  const preguntas = useMemo(() => (sesion ? preguntasDe(sesion, banco) : null), [sesion])

  function empezarSimulacro(tipo: TipoSimulacro) {
    setSesion(nuevaSesion({ tipo: 'simulacro', simulacro: tipo, modo: 'test', preguntas: generarSimulacro(banco, programa, tipo) }))
    setPantalla('sesion')
  }

  function empezarTema(opcionesTema: OpcionesTema, modo: Modo) {
    setSesion(nuevaSesion({ tipo: 'tema', modo, opcionesTema, preguntas: generarTestTema(banco, opcionesTema) }))
    setPantalla('sesion')
  }

  function repetir() {
    if (!sesion) return
    if (sesion.tipo === 'simulacro' && sesion.simulacro) empezarSimulacro(sesion.simulacro)
    else if (sesion.opcionesTema) empezarTema(sesion.opcionesTema, sesion.modo)
  }

  if (pantalla === 'tema') return <ConfigurarTema onEmpezar={empezarTema} onVolver={() => setPantalla('inicio')} />

  if (pantalla === 'sesion' && sesion && preguntas) {
    return (
      <PantallaPregunta
        key={sesion.id}
        sesion={sesion}
        preguntas={preguntas}
        onResponder={(i, k) => setSesion((s) => s && responder(s, i, k))}
        onIr={(i) => setSesion((s) => s && irA(s, i))}
        onTerminar={() => {
          setSesion((s) => s && terminar(s))
          setPantalla('resultado')
        }}
        onSalir={() => setPantalla('inicio')}
      />
    )
  }

  if (pantalla === 'resultado' && sesion && preguntas) {
    return (
      <Resultado
        sesion={sesion}
        preguntas={preguntas}
        resumen={resumir(sesion, preguntas, programa)}
        onInicio={() => {
          setSesion(null)
          setPantalla('inicio')
        }}
        onRepetir={repetir}
      />
    )
  }

  return (
    <Inicio
      enCurso={sesion && !sesion.fin ? sesion : null}
      onContinuar={() => setPantalla('sesion')}
      onDescartar={() => setSesion(null)}
      onSimulacro={empezarSimulacro}
      onTema={() => setPantalla('tema')}
    />
  )
}
