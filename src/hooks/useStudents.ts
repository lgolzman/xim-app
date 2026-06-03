import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Student } from '../lib/types'

interface CreateStudentData {
  full_name: string
  email?: string
  birth_date?: string
  height_cm?: string
  weight_kg?: string
  goal?: string
  created_by_admin: string
}

const getSupabaseErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error) return err.message

  if (err && typeof err === 'object') {
    const errorLike = err as {
      message?: unknown
      details?: unknown
      hint?: unknown
      code?: unknown
    }
    const parts = [
      typeof errorLike.message === 'string' ? errorLike.message : null,
      typeof errorLike.details === 'string' ? errorLike.details : null,
      typeof errorLike.hint === 'string' ? errorLike.hint : null,
      typeof errorLike.code === 'string' ? `Código: ${errorLike.code}` : null,
    ].filter(Boolean)

    if (parts.length > 0) return parts.join(' · ')
  }

  return fallback
}

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(false)

  const fetchStudents = useCallback(async () => {
    if (!isMountedRef.current) return
    setLoading(true)
    setError(null)

    try {
      const query = supabase
        .from('profiles')
        .select('*')
        .or('role.eq.consulta,is_student.eq.true')
        .order('full_name', { nullsFirst: false })

      const { data, error } = await query

      if (error) throw error
      if (!isMountedRef.current) return
      setStudents((data || []) as Student[])
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error && err.name === 'AbortError'
        ? 'La solicitud tardó demasiado. Intenta recargar la página.'
        : getSupabaseErrorMessage(err, 'Error al cargar alumnos'))
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    fetchStudents()
    return () => {
      isMountedRef.current = false
    }
  }, [fetchStudents])

  const enableStudent = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          active: true,
          account_status: 'active',
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
      return { error: getSupabaseErrorMessage(err, 'Error al habilitar alumno') }
    }
  }

  const disableStudent = async (studentId: string, disabledBy: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          active: false,
          account_status: 'disabled',
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
      return { error: getSupabaseErrorMessage(err, 'Error al inhabilitar alumno') }
    }
  }

  const createStudent = async (data: CreateStudentData): Promise<{ student: Student | null; error: string | null }> => {
    try {
      const fullName = data.full_name.trim()
      const email = data.email?.trim().toLowerCase() || null

      if (!fullName) {
        return { student: null, error: 'Ingresá el nombre del alumno' }
      }

      const height = data.height_cm?.trim() ? Number(data.height_cm) : null
      const weight = data.weight_kg?.trim() ? Number(data.weight_kg) : null

      if (height !== null && (!Number.isFinite(height) || height <= 0)) {
        return { student: null, error: 'La altura debe ser un número mayor a cero' }
      }

      if (weight !== null && (!Number.isFinite(weight) || weight <= 0)) {
        return { student: null, error: 'El peso debe ser un número mayor a cero' }
      }

      const { data: studentData, error: insertError } = await supabase
        .rpc('create_pending_student', {
          p_full_name: fullName,
          p_email: email,
          p_birth_date: data.birth_date || null,
          p_height_cm: height,
          p_weight_kg: weight,
          p_goal: data.goal?.trim() || null,
        } as any)

      if (insertError) throw insertError

      await fetchStudents()
      return { student: studentData as Student, error: null }
    } catch (err) {
      return { student: null, error: getSupabaseErrorMessage(err, 'Error al crear alumno') }
    }
  }

  const addSelfAsStudent = async (profileId: string): Promise<{ student: Student | null; error: string | null }> => {
    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({ is_student: true })
        .eq('id', profileId)
        .select()
        .single()

      if (updateError) throw updateError

      await fetchStudents()
      return { student: data as Student, error: null }
    } catch (err) {
      return { student: null, error: getSupabaseErrorMessage(err, 'Error al agregarte como alumna') }
    }
  }

  return {
    students,
    loading,
    error,
    refetch: fetchStudents,
    createStudent,
    addSelfAsStudent,
    enableStudent,
    disableStudent,
  }
}
