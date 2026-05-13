import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { createFetchAbortSignal } from './supabaseFetch'
import type {
  Routine,
  RoutineWithStudent,
  RoutineWithDays,
  RoutineDay,
  RoutineBlock,
  BlockExercise,
  PrescribedSet,
  RoutineStatus,
} from '../lib/types'

// Datos para crear una rutina completa
export interface CreateRoutineData {
  student_id: string
  name: string
  total_weeks: number
  days: CreateRoutineDayData[]
}

export interface CreateRoutineDayData {
  day_number: number
  name?: string
  blocks: CreateBlockData[]
}

export interface CreateBlockData {
  block_letter: string
  block_order: number
  exercises: CreateBlockExerciseData[]
}

export interface CreateBlockExerciseData {
  exercise_id: string
  position: number
  note?: string
  sets: CreatePrescribedSetData[]
}

export interface CreatePrescribedSetData {
  week_number: number
  set_number: number
  set_type: 'reps' | 'time'
  quantity: number
  weight_kg?: number
}

export function useRoutines(studentId?: string) {
  const [routines, setRoutines] = useState<RoutineWithStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(false)

  const fetchRoutines = useCallback(async (signal?: AbortSignal) => {
    if (!isMountedRef.current) return
    setLoading(true)
    setError(null)
    const { signal: requestSignal, cleanup } = createFetchAbortSignal(signal)

    try {
      let query = supabase
        .from('routines')
        .select(`
          *,
          student:profiles!student_id(*)
        `)
        .order('created_at', { ascending: false })

      if (studentId) {
        query = query.eq('student_id', studentId)
      }

      const { data, error } = await query.abortSignal(requestSignal)

      if (error) throw error
      if (!isMountedRef.current) return
      setRoutines((data || []) as RoutineWithStudent[])
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error && err.name === 'AbortError'
        ? 'La solicitud tardó demasiado. Intenta recargar la página.'
        : err instanceof Error ? err.message : 'Error al cargar rutinas')
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
      cleanup()
    }
  }, [studentId])

  useEffect(() => {
    isMountedRef.current = true
    const controller = new AbortController()
    fetchRoutines(controller.signal)
    return () => {
      isMountedRef.current = false
      controller.abort()
    }
  }, [fetchRoutines])

  // Obtener una rutina con todos sus detalles (días, bloques, ejercicios, series)
  const getRoutineWithDetails = useCallback(async (routineId: string): Promise<{ data: RoutineWithDays | null; error: string | null }> => {
    try {
      const { data, error } = await supabase
        .from('routines')
        .select(`
          *,
          routine_days(
            *,
            routine_blocks(
              *,
              block_exercises(
                *,
                exercise:exercises(*),
                prescribed_sets(*)
              )
            )
          )
        `)
        .eq('id', routineId)
        .single()

      if (error) throw error

      // Ordenar los datos
      if (data?.routine_days) {
        data.routine_days.sort((a: RoutineDay, b: RoutineDay) => a.day_number - b.day_number)
        data.routine_days.forEach((day: any) => {
          if (day.routine_blocks) {
            day.routine_blocks.sort((a: RoutineBlock, b: RoutineBlock) => a.block_order - b.block_order)
            day.routine_blocks.forEach((block: any) => {
              if (block.block_exercises) {
                block.block_exercises.sort((a: BlockExercise, b: BlockExercise) => a.position - b.position)
                block.block_exercises.forEach((ex: any) => {
                  if (ex.prescribed_sets) {
                    ex.prescribed_sets.sort((a: PrescribedSet, b: PrescribedSet) =>
                      a.week_number - b.week_number || a.set_number - b.set_number
                    )
                  }
                })
              }
            })
          }
        })
      }

      return { data: data as RoutineWithDays, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Error al cargar rutina' }
    }
  }, [])

  // Crear una rutina completa con todos sus datos anidados
  const createRoutine = async (data: CreateRoutineData, createdBy: string): Promise<{ data: Routine | null; error: string | null }> => {
    try {
      // 1. Crear la rutina
      const { data: routine, error: routineError } = await supabase
        .from('routines')
        .insert({
          student_id: data.student_id,
          created_by: createdBy,
          name: data.name,
          total_weeks: data.total_weeks,
          status: 'draft',
        })
        .select()
        .single()

      if (routineError) throw routineError

      // 2. Crear días
      for (const day of data.days) {
        const { data: routineDay, error: dayError } = await supabase
          .from('routine_days')
          .insert({
            routine_id: routine.id,
            day_number: day.day_number,
            name: day.name || null,
          })
          .select()
          .single()

        if (dayError) throw dayError

        // 3. Crear bloques
        for (const block of day.blocks) {
          const { data: routineBlock, error: blockError } = await supabase
            .from('routine_blocks')
            .insert({
              routine_day_id: routineDay.id,
              block_letter: block.block_letter,
              block_order: block.block_order,
            })
            .select()
            .single()

          if (blockError) throw blockError

          // 4. Crear ejercicios del bloque
          for (const exercise of block.exercises) {
            const { data: blockExercise, error: exerciseError } = await supabase
              .from('block_exercises')
              .insert({
                block_id: routineBlock.id,
                exercise_id: exercise.exercise_id,
                position: exercise.position,
                note: exercise.note || null,
              })
              .select()
              .single()

            if (exerciseError) throw exerciseError

            // 5. Crear series prescritas
            if (exercise.sets.length > 0) {
              const setsToInsert = exercise.sets.map(set => ({
                block_exercise_id: blockExercise.id,
                week_number: set.week_number,
                set_number: set.set_number,
                set_type: set.set_type,
                quantity: set.quantity,
                weight_kg: set.weight_kg || null,
              }))

              const { error: setsError } = await supabase
                .from('prescribed_sets')
                .insert(setsToInsert)

              if (setsError) throw setsError
            }
          }
        }
      }

      await fetchRoutines()
      return { data: routine as Routine, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Error al crear rutina' }
    }
  }

  // Actualizar estado de la rutina
  const updateRoutineStatus = async (routineId: string, status: RoutineStatus): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase
        .from('routines')
        .update({ status })
        .eq('id', routineId)

      if (error) throw error
      await fetchRoutines()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error al actualizar estado' }
    }
  }

  const reactivateArchivedRoutine = async (routineId: string, studentId: string): Promise<{ error: string | null }> => {
    try {
      const { error: draftActiveError } = await supabase
        .from('routines')
        .update({ status: 'draft' })
        .eq('student_id', studentId)
        .eq('status', 'active')
        .neq('id', routineId)

      if (draftActiveError) throw draftActiveError

      const { error: activateError } = await supabase
        .from('routines')
        .update({ status: 'active' })
        .eq('id', routineId)
        .eq('status', 'archived')

      if (activateError) throw activateError

      await fetchRoutines()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error al reactivar rutina' }
    }
  }

  // Actualizar nombre de la rutina
  const updateRoutineName = async (routineId: string, name: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase
        .from('routines')
        .update({ name })
        .eq('id', routineId)

      if (error) throw error
      await fetchRoutines()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error al actualizar nombre' }
    }
  }

  // Eliminar rutina (solo borradores)
  const deleteRoutine = async (routineId: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase
        .from('routines')
        .delete()
        .eq('id', routineId)
        .eq('status', 'draft') // Solo permite eliminar borradores

      if (error) throw error
      await fetchRoutines()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error al eliminar rutina' }
    }
  }

  return {
    routines,
    loading,
    error,
    refetch: fetchRoutines,
    getRoutineWithDetails,
    createRoutine,
    updateRoutineStatus,
    reactivateArchivedRoutine,
    updateRoutineName,
    deleteRoutine,
  }
}
