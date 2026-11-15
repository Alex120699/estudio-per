import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ContextoHistorial } from '../logica/seleccion'
import { leerHistorial, type Historial } from './db'

const VACIO: Historial = { respuestas: [], sesiones: [], caja: new Map() }

/**
 * Carga el historial de IndexedDB y lo expone con un `recargar` para llamarlo tras
 * cada escritura. El volumen es pequeño (miles de filas como mucho), así que se lee entero.
 */
export function useHistorial() {
  const [historial, setHistorial] = useState<Historial>(VACIO)
  const [cargado, setCargado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    try {
      setHistorial(await leerHistorial())
      setError(null)
    } catch (e) {
      // Sin IndexedDB (algunos modos privados) la app sigue funcionando, pero sin historial.
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCargado(true)
    }
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const contexto = useMemo<ContextoHistorial>(
    () => ({ vistas: new Set(historial.respuestas.map((r) => r.preguntaId)), enCaja: new Set(historial.caja.keys()) }),
    [historial],
  )

  return { historial, contexto, cargado, error, recargar }
}
