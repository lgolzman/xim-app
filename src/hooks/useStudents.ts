import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Student } from '../lib/types'

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'consulta')
        .order('email')

      if (error) throw error
      setStudents((data || []) as Student[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar alumnos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const enableStudent = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          active: true,
          disabled_by: null,
          disabled_at: null,
        })
        .eq('id', studentId)

      if (error) throw error
      await fetchStudents()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error al habilitar alumno' }
    }
  }

  const disableStudent = async (studentId: string, disabledBy: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          active: false,
          disabled_by: disabledBy,
          disabled_at: new Date().toISOString(),
        })
        .eq('id', studentId)

      if (error) throw error
      await fetchStudents()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error al inhabilitar alumno' }
    }
  }

  return {
    students,
    loading,
    error,
    refetch: fetchStudents,
    enableStudent,
    disableStudent,
  }
}
