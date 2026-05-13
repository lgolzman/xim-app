import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { createFetchAbortSignal } from './supabaseFetch'
import type { Direction } from '../lib/types'

export function useDirections() {
  const [directions, setDirections] = useState<Direction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(false)

  const fetchDirections = useCallback(async (signal?: AbortSignal) => {
    if (!isMountedRef.current) return
    setLoading(true)
    setError(null)
    const { signal: requestSignal, cleanup } = createFetchAbortSignal(signal)

    try {
      const query = supabase
        .from('directions')
        .select('*')
        .order('name')

      const { data, error } = await query.abortSignal(requestSignal)

      if (error) throw error
      if (!isMountedRef.current) return
      setDirections(data || [])
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error && err.name === 'AbortError'
        ? 'La solicitud tardó demasiado. Intenta recargar la página.'
        : err instanceof Error ? err.message : 'Error al cargar direcciones')
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
      cleanup()
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    const controller = new AbortController()
    fetchDirections(controller.signal)
    return () => {
      isMountedRef.current = false
      controller.abort()
    }
  }, [fetchDirections])

  return {
    directions,
    loading,
    error,
    refetch: fetchDirections,
  }
}
