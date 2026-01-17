import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { MovementPattern } from '../lib/types'

export function useMovementPatterns() {
  const [patterns, setPatterns] = useState<MovementPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPatterns = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('movement_patterns')
        .select('*')
        .order('name')

      if (error) throw error
      setPatterns(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar patrones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPatterns()
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
