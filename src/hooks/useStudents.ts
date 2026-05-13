import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { createFetchAbortSignal } from './supabaseFetch'
import type { Student } from '../lib/types'

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(false)

  const fetchStudents = useCallback(async (signal?: AbortSignal) => {
    if (!isMountedRef.current) return
    setLoading(true)
    setError(null)
    const { signal: requestSignal, cleanup } = createFetchAbortSignal(signal)

    try {
      const query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'consulta')
        .order('email')

      const { data, error } = await query.abortSignal(requestSignal)

      if (error) throw error
      if (!isMountedRef.current) return
      setStudents((data || []) as Student[])
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error && err.name === 'AbortError'
        ? 'La solicitud tardó demasiado. Intenta recargar la página.'
        : err instanceof Error ? err.message : 'Error al cargar alumnos')
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
    fetchStudents(controller.signal)
    return () => {
      isMountedRef.current = false
      controller.abort()
    }
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
        .select('id')
        .single()

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
        .select('id')
        .single()

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
