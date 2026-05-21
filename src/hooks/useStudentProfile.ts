import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Student, StudentNote } from '../lib/types'

export interface StudentProfileData {
  birth_date: string
  height_cm: string
  weight_kg: string
  goal: string
}

export function useStudentProfile(studentId: string | undefined) {
  const [notes, setNotes] = useState<StudentNote[]>([])
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(false)

  const fetchNotes = useCallback(async () => {
    if (!isMountedRef.current) return

    if (!studentId) {
      setNotes([])
      setLoadingNotes(false)
      return
    }

    setLoadingNotes(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('student_notes')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!isMountedRef.current) return
      setNotes((data || []) as StudentNote[])
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error ? err.message : 'Error al cargar notas')
    } finally {
      if (isMountedRef.current) {
        setLoadingNotes(false)
      }
    }
  }, [studentId])

  useEffect(() => {
    isMountedRef.current = true
    fetchNotes()
    return () => {
      isMountedRef.current = false
    }
  }, [fetchNotes])

  const updateStudentProfile = async (
    profileData: StudentProfileData
  ): Promise<{ data: Student | null; error: string | null }> => {
    if (!studentId) {
      return { data: null, error: 'Alumno no encontrado' }
    }

    const height = profileData.height_cm.trim()
      ? Number(profileData.height_cm)
      : null
    const weight = profileData.weight_kg.trim()
      ? Number(profileData.weight_kg)
      : null

    if (height !== null && (!Number.isFinite(height) || height <= 0)) {
      return { data: null, error: 'La altura debe ser mayor a 0' }
    }

    if (weight !== null && (!Number.isFinite(weight) || weight <= 0)) {
      return { data: null, error: 'El peso debe ser mayor a 0' }
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          birth_date: profileData.birth_date || null,
          height_cm: height,
          weight_kg: weight,
          goal: profileData.goal.trim() || null,
          updated_profile_at: new Date().toISOString(),
        })
        .eq('id', studentId)
        .select('*')
        .single()

      if (error) throw error
      return { data: data as Student, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Error al guardar ficha' }
    }
  }

  const addStudentNote = async (
    note: string,
    createdBy: string
  ): Promise<{ data: StudentNote | null; error: string | null }> => {
    if (!studentId) {
      return { data: null, error: 'Alumno no encontrado' }
    }

    const trimmedNote = note.trim()
    if (!trimmedNote) {
      return { data: null, error: 'La nota no puede estar vacía' }
    }

    try {
      const { data, error } = await supabase
        .from('student_notes')
        .insert({
          student_id: studentId,
          created_by: createdBy,
          note: trimmedNote,
        })
        .select('*')
        .single()

      if (error) throw error

      const newNote = data as StudentNote
      setNotes(prev => [newNote, ...prev])
      return { data: newNote, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Error al agregar nota' }
    }
  }

  return {
    notes,
    loadingNotes,
    error,
    refetchNotes: fetchNotes,
    updateStudentProfile,
    addStudentNote,
  }
}
