import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { WorkoutLog, WorkoutLogWithDetails, LoggedSet } from '../lib/types'

export interface CreateWorkoutLogData {
  routine_id: string
  routine_day_id: string
  week_number: number
  student_note?: string
  logged_sets: CreateLoggedSetData[]
  exercise_notes?: CreateWorkoutExerciseNoteData[]
}

export interface CreateLoggedSetData {
  block_exercise_id: string
  set_number: number
  actual_reps?: number
  actual_weight_kg?: number
  actual_seconds?: number
}

export interface CreateWorkoutExerciseNoteData {
  block_exercise_id: string
  note: string
}

export function useWorkoutLogs(studentId?: string, routineId?: string) {
  const [logs, setLogs] = useState<WorkoutLogWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(false)

  const fetchLogs = useCallback(async () => {
    if (!isMountedRef.current) return

    if (!studentId) {
      setLogs([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('workout_logs')
        .select(`
          *,
          routine_day:routine_days(*),
          logged_sets(*),
          workout_exercise_notes(*)
        `)
        .eq('student_id', studentId)
        .order('completed_at', { ascending: false })

      if (routineId) {
        query = query.eq('routine_id', routineId)
      }

      const { data, error } = await query

      if (error) throw error

      // Ordenar logged_sets por set_number
      const logsWithSortedSets = ((data || []) as WorkoutLogWithDetails[]).map(log => ({
        ...log,
        logged_sets: log.logged_sets?.sort((a: LoggedSet, b: LoggedSet) =>
          a.block_exercise_id.localeCompare(b.block_exercise_id) || a.set_number - b.set_number
        ) || []
      }))

      if (!isMountedRef.current) return
      setLogs(logsWithSortedSets as WorkoutLogWithDetails[])
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error && err.name === 'AbortError'
        ? 'La solicitud tardó demasiado. Intenta recargar la página.'
        : err instanceof Error ? err.message : 'Error al cargar historial')
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [studentId, routineId])

  useEffect(() => {
    isMountedRef.current = true
    fetchLogs()
    return () => {
      isMountedRef.current = false
    }
  }, [fetchLogs])

  // Obtener el último workout log
  const getLastLog = (): WorkoutLogWithDetails | null => {
    return logs.length > 0 ? logs[0] : null
  }

  // Obtener el último log de un día específico
  const getLastLogForDay = (routineDayId: string): WorkoutLogWithDetails | null => {
    return logs.find(log => log.routine_day_id === routineDayId) || null
  }

  // Obtener un log específico por ID
  const getLogById = async (logId: string): Promise<{ data: WorkoutLogWithDetails | null; error: string | null }> => {
    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .select(`
          *,
          routine_day:routine_days(*),
          logged_sets(*),
          workout_exercise_notes(*)
        `)
        .eq('id', logId)
        .single()

      if (error) throw error

      // Ordenar logged_sets
      if (data?.logged_sets) {
        data.logged_sets.sort((a: LoggedSet, b: LoggedSet) =>
          a.block_exercise_id.localeCompare(b.block_exercise_id) || a.set_number - b.set_number
        )
      }

      return { data: data as WorkoutLogWithDetails, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Error al cargar registro' }
    }
  }

  // Crear un nuevo registro de entrenamiento
  const createWorkoutLog = async (
    data: CreateWorkoutLogData,
    studentId: string,
    registeredBy?: string
  ): Promise<{ data: WorkoutLog | null; error: string | null }> => {
    try {
      // 1. Crear el workout log
      const { data: log, error: logError } = await supabase
        .from('workout_logs')
        .insert({
          student_id: studentId,
          routine_id: data.routine_id,
          routine_day_id: data.routine_day_id,
          week_number: data.week_number,
          student_note: data.student_note || null,
          registered_by: registeredBy || studentId,
        })
        .select()
        .single()

      if (logError) throw logError

      // 2. Crear los logged sets
      if (data.logged_sets.length > 0) {
        const setsToInsert = data.logged_sets.map(set => ({
          workout_log_id: log.id,
          block_exercise_id: set.block_exercise_id,
          set_number: set.set_number,
          actual_reps: set.actual_reps || null,
          actual_weight_kg: set.actual_weight_kg || null,
          actual_seconds: set.actual_seconds || null,
        }))

        const { error: setsError } = await supabase
          .from('logged_sets')
          .insert(setsToInsert)

        if (setsError) throw setsError
      }

      // 3. Crear notas por ejercicio
      const notesToInsert = (data.exercise_notes || [])
        .map(note => ({
          workout_log_id: log.id,
          block_exercise_id: note.block_exercise_id,
          note: note.note.trim(),
        }))
        .filter(note => note.note.length > 0)

      if (notesToInsert.length > 0) {
        const { error: notesError } = await supabase
          .from('workout_exercise_notes')
          .insert(notesToInsert)

        if (notesError) throw notesError
      }

      supabase.functions
        .invoke('notify-workout-completed', {
          body: { workoutLogId: log.id },
        })
        .then(({ error }) => {
          if (error) console.error('Error sending workout notification:', error)
        })
        .catch(err => console.error('Error sending workout notification:', err))

      void fetchLogs()
      return { data: log as WorkoutLog, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Error al guardar entrenamiento' }
    }
  }

  // Actualizar nota del alumno en un log existente
  const updateLogNote = async (logId: string, note: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase
        .from('workout_logs')
        .update({ student_note: note })
        .eq('id', logId)

      if (error) throw error
      await fetchLogs()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error al actualizar nota' }
    }
  }

  // Contar entrenamientos completados por semana
  const countLogsByWeek = (weekNumber: number): number => {
    return logs.filter(log => log.week_number === weekNumber).length
  }

  // Obtener logs de una semana específica
  const getLogsByWeek = (weekNumber: number): WorkoutLogWithDetails[] => {
    return logs.filter(log => log.week_number === weekNumber)
  }

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
    getLastLog,
    getLastLogForDay,
    getLogById,
    createWorkoutLog,
    updateLogNote,
    countLogsByWeek,
    getLogsByWeek,
  }
}
