import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Muscle } from '../lib/types'

export function useMuscles() {
  const [muscles, setMuscles] = useState<Muscle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(false)

  const fetchMuscles = useCallback(async () => {
    if (!isMountedRef.current) return
    setLoading(true)
    setError(null)

    try {
      const query = supabase
        .from('muscles')
        .select('*')
        .order('name')

      const { data, error } = await query

      if (error) throw error
      if (!isMountedRef.current) return
      setMuscles(data || [])
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error && err.name === 'AbortError'
        ? 'La solicitud tardó demasiado. Intenta recargar la página.'
        : err instanceof Error ? err.message : 'Error al cargar músculos')
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    fetchMuscles()
    return () => {
      isMountedRef.current = false
    }
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
