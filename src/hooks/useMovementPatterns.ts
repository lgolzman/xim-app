import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { createFetchAbortSignal } from './supabaseFetch'
import type { MovementPattern } from '../lib/types'

export function useMovementPatterns() {
  const [patterns, setPatterns] = useState<MovementPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(false)

  const fetchPatterns = useCallback(async (signal?: AbortSignal) => {
    if (!isMountedRef.current) return
    setLoading(true)
    setError(null)
    const { signal: requestSignal, cleanup } = createFetchAbortSignal(signal)

    try {
      const query = supabase
        .from('movement_patterns')
        .select('*')
        .order('name')

      const { data, error } = await query.abortSignal(requestSignal)

      if (error) throw error
      if (!isMountedRef.current) return
      setPatterns(data || [])
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error && err.name === 'AbortError'
        ? 'La solicitud tardó demasiado. Intenta recargar la página.'
        : err instanceof Error ? err.message : 'Error al cargar patrones')
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
    fetchPatterns(controller.signal)
    return () => {
      isMountedRef.current = false
      controller.abort()
    }
  }, [fetchPatterns])

  const createPattern = async (name: string) => {
    try {
      const { error: insertError } = await supabase.from('movement_patterns').insert({ name } as any)
      if (insertError) throw insertError
      await fetchPatterns()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error al crear patrón' }
    }
  }

  const updatePattern = async (id: string, name: string) => {
    try {
      const { error: updateError } = await supabase.from('movement_patterns').update({ name } as any).eq('id', id)
      if (updateError) throw updateError
      await fetchPatterns()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error al actualizar patrón' }
    }
  }

  const deletePattern = async (id: string) => {
    try {
      const { error } = await supabase.from('movement_patterns').delete().eq('id', id)
      if (error) throw error
      await fetchPatterns()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error al eliminar patrón' }
    }
  }

  return {
    patterns,
    loading,
    error,
    refetch: fetchPatterns,
    createPattern,
    updatePattern,
    deletePattern,
  }
}
