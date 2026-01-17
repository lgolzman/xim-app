import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Direction } from '../lib/types'

export function useDirections() {
  const [directions, setDirections] = useState<Direction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDirections = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('directions')
        .select('*')
        .order('name')

      if (error) throw error
      setDirections(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar direcciones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDirections()
  }, [fetchDirections])

  return {
    directions,
    loading,
    error,
    refetch: fetchDirections,
  }
}
