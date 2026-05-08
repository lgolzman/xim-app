import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Muscle } from '../lib/types'

export function useMuscles() {
  const [muscles, setMuscles] = useState<Muscle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMuscles = useCallback(async () => {
    console.log('[useMuscles] fetchMuscles called, setting loading=true')
    setLoading(true)
    setError(null)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      console.warn('[useMuscles] Request timed out after 10s')
      controller.abort()
    }, 10000)

    try {
      const { data, error } = await supabase
        .from('muscles')
        .select('*')
        .order('name')
        .abortSignal(controller.signal)

      clearTimeout(timeoutId)
      console.log('[useMuscles] Request complete:', data?.length, 'items')
      if (error) throw error
      setMuscles(data || [])
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('[useMuscles] Request aborted (timeout)')
        setError('La solicitud tardó demasiado. Intenta recargar la página.')
      } else {
        console.error('[useMuscles] Error:', err)
        setError(err instanceof Error ? err.message : 'Error al cargar músculos')
      }
    } finally {
      console.log('[useMuscles] Finally: setting loading=false')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    console.log('[useMuscles] useEffect mounted')
    fetchMuscles()
    return () => console.log('[useMuscles] useEffect cleanup')
  }, [fetchMuscles])

  const createMuscle = async (name: string) => {
    try {
      const { error: insertError } = await supabase.from('muscles').insert({ name } as any)
      if (insertError) throw insertError
      await fetchMuscles()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error al crear músculo' }
    }
  }

  const updateMuscle = async (id: string, name: string) => {
    try {
      const { error: updateError } = await supabase.from('muscles').update({ name } as any).eq('id', id)
      if (updateError) throw updateError
      await fetchMuscles()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error al actualizar músculo' }
    }
  }

  const deleteMuscle = async (id: string) => {
    try {
      const { error } = await supabase.from('muscles').delete().eq('id', id)
      if (error) throw error
      await fetchMuscles()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error al eliminar músculo' }
    }
  }

  return {
    muscles,
    loading,
    error,
    refetch: fetchMuscles,
    createMuscle,
    updateMuscle,
    deleteMuscle,
  }
}
