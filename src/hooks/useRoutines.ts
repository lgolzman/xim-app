import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
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

export interface UpdateRoutineData {
  name: string
  total_weeks: number
  days: UpdateRoutineDayData[]
}

export interface UpdateRoutineDayData {
  id: string
  day_number: number
  name?: string
  blocks: UpdateRoutineBlockData[]
}

export interface UpdateRoutineBlockData {
  id: string
  block_letter: string
  block_order: number
  exercises: UpdateRoutineExerciseData[]
}

export interface UpdateRoutineExerciseData {
  id: string
  exercise_id: string
  position: number
  note?: string
  sets: UpdatePrescribedSetData[]
}

export interface UpdatePrescribedSetData extends CreatePrescribedSetData {
  id?: string
}

interface GetRoutineWithDetailsOptions {
  includeInactiveBlockExercises?: boolean
}

export function useRoutines(studentId?: string) {
  const [routines, setRoutines] = useState<RoutineWithStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(false)

  const fetchRoutines = useCallback(async () => {
    if (!isMountedRef.current) return
    setLoading(true)
    setError(null)

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

      const { data, error } = await query

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
    }
  }, [studentId])

  useEffect(() => {
    isMountedRef.current = true
    fetchRoutines()
    return () => {
      isMountedRef.current = false
    }
  }, [fetchRoutines])

  // Obtener una rutina con todos sus detalles (días, bloques, ejercicios, series)
  const getRoutineWithDetails = useCallback(async (
    routineId: string,
    options: GetRoutineWithDetailsOptions = {}
  ): Promise<{ data: RoutineWithDays | null; error: string | null }> => {
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
        .maybeSingle()

      if (error) throw error
      if (!data) return { data: null, error: 'Rutina no encontrada' }

      // Ordenar los datos
      if (data?.routine_days) {
        data.routine_days.sort((a: RoutineDay, b: RoutineDay) => a.day_number - b.day_number)
        data.routine_days.forEach((day: any) => {
          if (day.routine_blocks) {
            day.routine_blocks.sort((a: RoutineBlock, b: RoutineBlock) => a.block_order - b.block_order)
            day.routine_blocks.forEach((block: any) => {
              if (block.block_exercises) {
                if (!options.includeInactiveBlockExercises) {
                  block.block_exercises = block.block_exercises.filter((ex: BlockExercise) => ex.active !== false)
                }
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
                active: true,
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

  const updateRoutine = async (routineId: string, data: UpdateRoutineData): Promise<{ error: string | null }> => {
    try {
      const current = await getRoutineWithDetails(routineId, { includeInactiveBlockExercises: true })
      if (current.error) throw new Error(current.error)
      if (!current.data) throw new Error('Rutina no encontrada')

      const existingDays = new Map(current.data.routine_days.map(day => [day.id, day]))
      const existingBlocks = new Map<string, RoutineBlock>()
      const existingExercises = new Map<string, BlockExercise>()

      current.data.routine_days.forEach(day => {
        day.routine_blocks.forEach(block => {
          existingBlocks.set(block.id, block)
          block.block_exercises.forEach(exercise => {
            existingExercises.set(exercise.id, exercise)
          })
        })
      })

      const keptDayIds = new Set<string>()
      const keptBlockIds = new Set<string>()
      const keptExerciseIds = new Set(
        data.days.flatMap(day =>
          day.blocks.flatMap(block =>
            block.exercises.map(exercise => exercise.id)
          )
        )
      )

      const { error: routineError } = await supabase
        .from('routines')
        .update({
          name: data.name,
          total_weeks: data.total_weeks,
        })
        .eq('id', routineId)

      if (routineError) throw routineError

      for (const [exerciseId] of existingExercises) {
        if (keptExerciseIds.has(exerciseId)) continue

        const { count, error: countError } = await supabase
          .from('logged_sets')
          .select('id', { count: 'exact', head: true })
          .eq('block_exercise_id', exerciseId)

        if (countError) throw countError

        if ((count || 0) > 0) {
          const { error: deactivateExerciseError } = await supabase
            .from('block_exercises')
            .update({ active: false })
            .eq('id', exerciseId)

          if (deactivateExerciseError) throw deactivateExerciseError
          continue
        }

        const { error: deleteExerciseError } = await supabase
          .from('block_exercises')
          .delete()
          .eq('id', exerciseId)

        if (deleteExerciseError) throw deleteExerciseError
      }

      for (const day of data.days) {
        let dayId = day.id

        if (existingDays.has(day.id)) {
          const { error } = await supabase
            .from('routine_days')
            .update({
              day_number: day.day_number,
              name: day.name || null,
            })
            .eq('id', day.id)

          if (error) throw error
        } else {
          const { data: insertedDay, error } = await supabase
            .from('routine_days')
            .insert({
              routine_id: routineId,
              day_number: day.day_number,
              name: day.name || null,
            })
            .select()
            .single()

          if (error) throw error
          dayId = insertedDay.id
        }

        keptDayIds.add(dayId)

        for (const block of day.blocks) {
          let blockId = block.id

          if (existingBlocks.has(block.id)) {
            const { error } = await supabase
              .from('routine_blocks')
              .update({
                routine_day_id: dayId,
                block_letter: block.block_letter,
                block_order: block.block_order,
              })
              .eq('id', block.id)

            if (error) throw error
          } else {
            const { data: insertedBlock, error } = await supabase
              .from('routine_blocks')
              .insert({
                routine_day_id: dayId,
                block_letter: block.block_letter,
                block_order: block.block_order,
              })
              .select()
              .single()

            if (error) throw error
            blockId = insertedBlock.id
          }

          keptBlockIds.add(blockId)

          for (const exercise of block.exercises) {
            let blockExerciseId = exercise.id

            if (existingExercises.has(exercise.id)) {
              const { error } = await supabase
                .from('block_exercises')
                .update({
                  block_id: blockId,
                  exercise_id: exercise.exercise_id,
                  position: exercise.position,
                  note: exercise.note || null,
                  active: true,
                })
                .eq('id', exercise.id)

              if (error) throw error
            } else {
              const { data: insertedExercise, error } = await supabase
                .from('block_exercises')
                .insert({
                  block_id: blockId,
                  exercise_id: exercise.exercise_id,
                  position: exercise.position,
                  note: exercise.note || null,
                  active: true,
                })
                .select()
                .single()

              if (error) throw error
              blockExerciseId = insertedExercise.id
            }

            const { error: deleteSetsError } = await supabase
              .from('prescribed_sets')
              .delete()
              .eq('block_exercise_id', blockExerciseId)

            if (deleteSetsError) throw deleteSetsError

            const setsToInsert = exercise.sets.map(set => ({
              block_exercise_id: blockExerciseId,
              week_number: set.week_number,
              set_number: set.set_number,
              set_type: set.set_type,
              quantity: set.quantity,
              weight_kg: set.weight_kg || null,
            }))

            if (setsToInsert.length > 0) {
              const { error: insertSetsError } = await supabase
                .from('prescribed_sets')
                .insert(setsToInsert)

              if (insertSetsError) throw insertSetsError
            }
          }
        }
      }

      for (const [blockId] of existingBlocks) {
        if (keptBlockIds.has(blockId)) continue

        const { count, error: countError } = await supabase
          .from('block_exercises')
          .select('id', { count: 'exact', head: true })
          .eq('block_id', blockId)

        if (countError) throw countError
        if ((count || 0) > 0) {
          continue
        }

        const { error: deleteBlockError } = await supabase
          .from('routine_blocks')
          .delete()
          .eq('id', blockId)

        if (deleteBlockError) throw deleteBlockError
      }

      for (const [dayId] of existingDays) {
        if (keptDayIds.has(dayId)) continue

        const { count, error: countError } = await supabase
          .from('routine_blocks')
          .select('id', { count: 'exact', head: true })
          .eq('routine_day_id', dayId)

        if (countError) throw countError
        if ((count || 0) > 0) {
          continue
        }

        const { error: deleteDayError } = await supabase
          .from('routine_days')
          .delete()
          .eq('id', dayId)

        if (deleteDayError) throw deleteDayError
      }

      await fetchRoutines()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error al actualizar rutina' }
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
    updateRoutine,
    updateRoutineStatus,
    reactivateArchivedRoutine,
    updateRoutineName,
    deleteRoutine,
  }
}
