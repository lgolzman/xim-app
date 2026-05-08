import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Muscle } from '../lib/types'

export function useMuscles() {
  const [muscles, setMuscles] = useState<Muscle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMuscles = useCallback(async () => {
    console.log('[useMuscles] Starting fetch, setting loading=true')
    setLoading(true)
    setError(null)

    try {
      console.log('[useMuscles] Making supabase request...')
      const { data, error } = await supabase
        .from('muscles')
        .select('*')
        .order('name')
      console.log('[useMuscles] Request complete, data:', data?.length, 'items, error:', error)

      if (error) throw error
      setMuscles(data || [])
      console.log('[useMuscles] setMuscles called')
    } catch (err) {
      console.error('[useMuscles] Error:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar músculos')
    } finally {
      console.log('[useMuscles] Finally block, setting loading=false')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    console.log('[useMuscles] useEffect running, calling fetchMuscles')
    fetchMuscles()
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
