import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type {
  RoutineWithDays,
  RoutineDay,
  RoutineBlock,
  BlockExercise,
  PrescribedSet,
  ExerciseInRoutine,
} from '../lib/types'
import { withPhotoPublicUrl } from './useExercisePhotos'

interface UseActiveRoutineOptions {
  includeInactiveBlockExercises?: boolean
}

type ActiveBlockExercise = BlockExercise & {
  exercise?: ExerciseInRoutine | null
  prescribed_sets?: PrescribedSet[]
}

type ActiveRoutineBlock = RoutineBlock & {
  block_exercises?: ActiveBlockExercise[]
}

type ActiveRoutineDay = RoutineDay & {
  routine_blocks?: ActiveRoutineBlock[]
}

const DISPLAY_BLOCK_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

const getDisplayBlockLetter = (index: number) => DISPLAY_BLOCK_LETTERS[index] || `X${index + 1}`

export function useActiveRoutine(
  studentId: string | undefined,
  options: UseActiveRoutineOptions = {}
) {
  const [routine, setRoutine] = useState<RoutineWithDays | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(false)

  const fetchActiveRoutine = useCallback(async () => {
    if (!isMountedRef.current) return

    if (!studentId) {
      setRoutine(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const query = supabase
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
                  direction:directions(*),
                  videos:exercise_videos(*),
                  photos:exercise_photos(*)
                ),
                prescribed_sets(*)
              )
            )
          )
        `)
        .eq('student_id', studentId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)

      const { data, error } = await query.maybeSingle()

      if (error) {
        throw error
      }

      if (!data) {
        if (!isMountedRef.current) return
        setRoutine(null)
        setLoading(false)
        return
      }

      // Ordenar los datos
      if (data?.routine_days) {
        data.routine_days.sort((a: RoutineDay, b: RoutineDay) => a.day_number - b.day_number)
        data.routine_days.forEach((day: ActiveRoutineDay) => {
          if (day.routine_blocks) {
            day.routine_blocks.sort((a: RoutineBlock, b: RoutineBlock) =>
              a.block_order - b.block_order || a.block_letter.localeCompare(b.block_letter)
            )
            day.routine_blocks.forEach((block: ActiveRoutineBlock, blockIndex: number) => {
              block.block_letter = getDisplayBlockLetter(blockIndex)
              block.block_order = blockIndex

              if (block.block_exercises) {
                if (!options.includeInactiveBlockExercises) {
                  block.block_exercises = block.block_exercises.filter((ex: BlockExercise) => ex.active !== false)
                }
                block.block_exercises.sort((a: BlockExercise, b: BlockExercise) => a.position - b.position)
                block.block_exercises.forEach((ex: ActiveBlockExercise) => {
                  if (ex.prescribed_sets) {
                    ex.prescribed_sets.sort((a: PrescribedSet, b: PrescribedSet) =>
                      a.week_number - b.week_number || a.set_number - b.set_number
                    )
                  }
                  if (ex.exercise?.videos) {
                    ex.exercise.videos.sort((a: { created_at: string }, b: { created_at: string }) =>
                      a.created_at.localeCompare(b.created_at)
                    )
                  }
                  if (ex.exercise?.photos) {
                    ex.exercise.photos.sort((a: { display_order: number }, b: { display_order: number }) =>
                      a.display_order - b.display_order
                    )
                    ex.exercise.photos = ex.exercise.photos.map(withPhotoPublicUrl)
                  }
                })
              }
            })
            if (!options.includeInactiveBlockExercises) {
              day.routine_blocks = day.routine_blocks.filter((block: RoutineBlock & { block_exercises?: BlockExercise[] }) =>
                (block.block_exercises?.length || 0) > 0
              )
            }
          }
        })
        if (!options.includeInactiveBlockExercises) {
          data.routine_days = data.routine_days.filter((day: RoutineDay & { routine_blocks?: RoutineBlock[] }) =>
            (day.routine_blocks?.length || 0) > 0
          )
        }
      }

      if (!isMountedRef.current) return
      setRoutine(data as RoutineWithDays)
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error && err.name === 'AbortError'
        ? 'La solicitud tardó demasiado. Intenta recargar la página.'
        : err instanceof Error ? err.message : 'Error al cargar rutina activa')
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [studentId, options.includeInactiveBlockExercises])

  useEffect(() => {
    isMountedRef.current = true
    fetchActiveRoutine()
    return () => {
      isMountedRef.current = false
    }
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
