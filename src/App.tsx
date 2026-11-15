import { useEffect, useMemo, useRef, useState } from 'react'
import Apuntes from './componentes/Apuntes'
import { idSeccion } from './logica/apuntes'
import ConfigurarTema from './componentes/ConfigurarTema'
import Estadisticas from './componentes/Estadisticas'
import Inicio from './componentes/Inicio'
import PantallaPregunta from './componentes/PantallaPregunta'
import Resultado from './componentes/Resultado'
import { guardarSesion, registrarRespuestas } from './datos/db'
import { useHistorial } from './datos/useHistorial'
import { pendientesHoy } from './logica/historial'
import { generarRepaso, generarSimulacro, generarTestTema, type OpcionesTema, type TipoSimulacro } from './logica/seleccion'
import {
  cargarEnCurso,
  guardarEnCurso,
  irA,
  nuevaSesion,
  preguntasDe,
  registroRespuesta,
  registroSesion,
  registrosAlTerminar,
  responder,
  resumir,
  terminar,
  type Modo,
  type Sesion,
} from './logica/sesion'
import { preguntas as banco } from './tipos/preguntas'
import { programa } from './tipos/programa'

type Pantalla = 'inicio' | 'tema' | 'sesion' | 'resultado' | 'estadisticas' | 'apuntes'

const VOLVER_A: Record<Pantalla, string> = {
  inicio: 'Inicio',
  tema: 'Test por tema',
  sesion: 'Volver a la pregunta',
  resultado: 'Volver al resultado',
  estadisticas: 'Estadísticas',
  apuntes: 'Apuntes',
}

/** Recupera la sesión guardada solo si sus preguntas siguen existiendo en el banco. */
function sesionGuardada(): Sesion | null {
  const s = cargarEnCurso()
  return s && preguntasDe(s, banco) ? s : null
}

export default function App() {
  const [pantalla, setPantalla] = useState<Pantalla>('inicio')
  const [sesion, setSesion] = useState<Sesion | null>(sesionGuardada)
  const { historial, contexto, error: errorHistorial, recargar } = useHistorial()
  const [apuntes, setApuntes] = useState<{ unidad: number | null; seccion?: string; volver: Pantalla }>({ unidad: null, volver: 'inicio' })
  // Al volver de los apuntes se recupera la posición en la pantalla de origen.
  const scrollGuardado = useRef<number | null>(null)

  // Guarda en cada cambio: así se puede cerrar la app a mitad y continuar después.
  useEffect(() => {
    guardarEnCurso(sesion)
  }, [sesion])
  useEffect(() => {
    // En los apuntes se va al principio o, si se pidió un apartado concreto, a ese apartado.
    const destino = pantalla === 'apuntes' && apuntes.seccion ? document.getElementById(idSeccion(apuntes.seccion)) : null
    if (destino) {
      destino.scrollIntoView({ block: 'start' })
      return
    }
    const y = pantalla === 'apuntes' ? 0 : (scrollGuardado.current ?? 0)
    if (pantalla !== 'apuntes') scrollGuardado.current = null
    window.scrollTo(0, y)
  }, [pantalla, sesion?.actual, apuntes.unidad, apuntes.seccion])

  /** Abre los apuntes de una unidad (null = índice), opcionalmente en un apartado («2.3»). */
  function abrirApuntes(unidad: number | null, seccion?: string) {
    if (pantalla !== 'apuntes') {
      scrollGuardado.current = window.scrollY
      setApuntes({ unidad, seccion, volver: pantalla })
    } else setApuntes((a) => ({ ...a, unidad, seccion }))
    setPantalla('apuntes')
  }

  const preguntas = useMemo(() => (sesion ? preguntasDe(sesion, banco) : null), [sesion])
  const pendientes = useMemo(() => pendientesHoy(historial.caja.values()), [historial])

  function abrir(s: Sesion) {
    setSesion(s)
    setPantalla('sesion')
  }

  function empezarSimulacro(tipo: TipoSimulacro) {
    abrir(nuevaSesion({ tipo: 'simulacro', simulacro: tipo, modo: 'test', preguntas: generarSimulacro(banco, programa, tipo) }))
  }

  function empezarTema(opcionesTema: OpcionesTema, modo: Modo) {
    abrir(nuevaSesion({ tipo: 'tema', modo, opcionesTema, preguntas: generarTestTema(banco, opcionesTema, Math.random, contexto) }))
  }

  function empezarRepaso() {
    if (pendientes.length === 0) {
      setSesion(null)
      setPantalla('inicio')
      return
    }
    abrir(nuevaSesion({ tipo: 'repaso', modo: 'estudio', preguntas: generarRepaso(banco, pendientes.map((e) => e.preguntaId)) }))
  }

  function repetir() {
    if (!sesion) return
    if (sesion.tipo === 'simulacro' && sesion.simulacro) empezarSimulacro(sesion.simulacro)
    else if (sesion.tipo === 'repaso') empezarRepaso()
    else if (sesion.opcionesTema) empezarTema(sesion.opcionesTema, sesion.modo)
  }

  async function alResponder(i: number, k: number) {
    if (!sesion || !preguntas) return
    // En modo estudio la respuesta queda fijada y se guarda en el historial al momento.
    if (sesion.modo === 'estudio' && sesion.respuestas[i] !== null) return
    setSesion((s) => s && responder(s, i, k))
    if (sesion.modo === 'estudio') {
      try {
        await registrarRespuestas([registroRespuesta(sesion, preguntas[i], k)])
      } finally {
        void recargar()
      }
    }
  }

  async function alTerminar() {
    if (!sesion || !preguntas) return
    // En estudio se puede parar a medias: el resultado cuenta solo lo respondido.
    const hechas = sesion.respuestas.flatMap((r, i) => (r === null ? [] : [i]))
    const recortada =
      sesion.modo === 'estudio' && hechas.length < sesion.respuestas.length
        ? { ...sesion, preguntaIds: hechas.map((i) => sesion.preguntaIds[i]), respuestas: hechas.map((i) => sesion.respuestas[i]), actual: 0 }
        : sesion
    const fin = terminar(recortada)
    const preguntasFin = preguntasDe(fin, banco)!
    setSesion(fin)
    setPantalla('resultado')
    try {
      await registrarRespuestas(registrosAlTerminar(fin, preguntasFin))
      await guardarSesion(registroSesion(fin, resumir(fin, preguntasFin, programa)))
    } finally {
      void recargar()
    }
  }

  if (pantalla === 'tema') return <ConfigurarTema contexto={contexto} onEmpezar={empezarTema} onVolver={() => setPantalla('inicio')} />

  if (pantalla === 'apuntes') {
    return (
      <Apuntes
        unidad={apuntes.unidad}
        onElegir={(u) => abrirApuntes(u)}
        onVolver={() => setPantalla(apuntes.volver)}
        textoVolver={VOLVER_A[apuntes.volver]}
      />
    )
  }

  if (pantalla === 'estadisticas') {
    return <Estadisticas historial={historial} onRecargar={recargar} onVolver={() => setPantalla('inicio')} />
  }

  if (pantalla === 'sesion' && sesion && preguntas) {
    return (
      <PantallaPregunta
        key={sesion.id}
        sesion={sesion}
        preguntas={preguntas}
        onResponder={alResponder}
        onIr={(i) => setSesion((s) => s && irA(s, i))}
        onTerminar={alTerminar}
        onSalir={() => setPantalla('inicio')}
        onApuntes={abrirApuntes}
      />
    )
  }

  if (pantalla === 'resultado' && sesion && preguntas) {
    return (
      <Resultado
        sesion={sesion}
        preguntas={preguntas}
        resumen={resumir(sesion, preguntas, programa)}
        caja={historial.caja}
        onInicio={() => {
          setSesion(null)
          setPantalla('inicio')
        }}
        onRepetir={repetir}
        onApuntes={abrirApuntes}
      />
    )
  }

  return (
    <Inicio
      enCurso={sesion && !sesion.fin ? sesion : null}
      historial={historial}
      pendientes={pendientes.length}
      errorHistorial={errorHistorial}
      onContinuar={() => setPantalla('sesion')}
      onDescartar={() => setSesion(null)}
      onSimulacro={empezarSimulacro}
      onTema={() => setPantalla('tema')}
      onRepaso={empezarRepaso}
      onEstadisticas={() => setPantalla('estadisticas')}
      onApuntes={() => abrirApuntes(null)}
    />
  )
}
