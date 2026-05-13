import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type {
  RoutineWithDays,
  RoutineDay,
  RoutineBlock,
  BlockExercise,
  PrescribedSet,
} from '../lib/types'

export function useActiveRoutine(studentId: string | undefined) {
  const [routine, setRoutine] = useState<RoutineWithDays | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActiveRoutine = useCallback(async () => {
    if (!studentId) {
      setRoutine(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

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
                exercise:exercises(
                  *,
                  movement_pattern:movement_patterns(*),
                  direction:directions(*)
                ),
                prescribed_sets(*)
              )
            )
          )
        `)
        .eq('student_id', studentId)
        .eq('status', 'active')
        .single()

      if (error) {
        // Si no hay rutina activa, no es un error
        if (error.code === 'PGRST116') {
          setRoutine(null)
          setLoading(false)
          return
        }
        throw error
      }

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

      setRoutine(data as RoutineWithDays)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar rutina activa')
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    fetchActiveRoutine()
  }, [fetchActiveRoutine])

  // Obtener un día específico de la rutina
  const getDay = (dayNumber: number) => {
    return routine?.routine_days.find(d => d.day_number === dayNumber) || null
  }

  // Obtener el día por ID
  const getDayById = (dayId: string) => {
    return routine?.routine_days.find(d => d.id === dayId) || null
  }

  // Obtener series prescritas para un ejercicio en una semana específica
  const getPrescribedSetsForWeek = (blockExerciseId: string, weekNumber: number): PrescribedSet[] => {
    if (!routine) return []

    for (const day of routine.routine_days) {
      for (const block of day.routine_blocks) {
        const exercise = block.block_exercises.find(e => e.id === blockExerciseId)
        if (exercise) {
          return exercise.prescribed_sets.filter(s => s.week_number === weekNumber)
        }
      }
    }

    return []
  }

  return {
    routine,
    loading,
    error,
    refetch: fetchActiveRoutine,
    getDay,
    getDayById,
    getPrescribedSetsForWeek,
  }
}
