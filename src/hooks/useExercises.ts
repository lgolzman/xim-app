import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { ExerciseWithRelations, ExerciseFormData, Exercise } from '../lib/types'

export function useExercises() {
  const [exercises, setExercises] = useState<ExerciseWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExercises = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('exercises')
        .select(`
          *,
          movement_pattern:movement_patterns(*),
          direction:directions(*)
        `)
        .order('name')

      if (exercisesError) throw exercisesError

      const exercisesWithMuscles = await Promise.all(
        (exercisesData || []).map(async (exercise: any) => {
          const [primaryMuscles, synergistMuscles, videos] = await Promise.all([
            supabase
              .from('exercise_primary_muscles')
              .select('muscle:muscles(*)')
              .eq('exercise_id', exercise.id),
            supabase
              .from('exercise_synergist_muscles')
              .select('muscle:muscles(*)')
              .eq('exercise_id', exercise.id),
            supabase
              .from('exercise_videos')
              .select('*')
              .eq('exercise_id', exercise.id),
          ])

          return {
            ...exercise,
            primary_muscles: primaryMuscles.data?.map((pm: any) => pm.muscle) || [],
            synergist_muscles: synergistMuscles.data?.map((sm: any) => sm.muscle) || [],
            videos: videos.data || [],
          } as ExerciseWithRelations
        })
      )

      setExercises(exercisesWithMuscles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar ejercicios')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchExercises()
  }, [fetchExercises])

  const createExercise = async (data: ExerciseFormData) => {
    try {
      const { data: exerciseResult, error: exerciseError } = await supabase
        .from('exercises')
        .insert({
          name: data.name,
          movement_pattern_id: data.movement_pattern_id || null,
          direction_id: data.direction_id || null,
          chain_type: data.chain_type,
          execution_tips: data.execution_tips || null,
        } as any)
        .select()
        .single()

      if (exerciseError) throw exerciseError

      const newExercise = exerciseResult as Exercise

      if (data.primary_muscle_ids.length > 0) {
        const { error: pmError } = await supabase
          .from('exercise_primary_muscles')
          .insert(
            data.primary_muscle_ids.map((muscle_id) => ({
              exercise_id: newExercise.id,
              muscle_id,
            })) as any
          )
        if (pmError) throw pmError
      }

      if (data.synergist_muscle_ids.length > 0) {
        const { error: smError } = await supabase
          .from('exercise_synergist_muscles')
          .insert(
            data.synergist_muscle_ids.map((muscle_id) => ({
              exercise_id: newExercise.id,
              muscle_id,
            })) as any
          )
        if (smError) throw smError
      }

      if (data.videos.length > 0) {
        const { error: vidError } = await supabase
          .from('exercise_videos')
          .insert(
            data.videos.map((video) => ({
              exercise_id: newExercise.id,
              url: video.url,
              title: video.title || null,
            })) as any
          )
        if (vidError) throw vidError
      }

      await fetchExercises()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error al crear ejercicio' }
    }
  }

  const updateExercise = async (id: string, data: ExerciseFormData) => {
    try {
      const { error: exerciseError } = await supabase
        .from('exercises')
        .update({
          name: data.name,
          movement_pattern_id: data.movement_pattern_id || null,
          direction_id: data.direction_id || null,
          chain_type: data.chain_type,
          execution_tips: data.execution_tips || null,
        } as any)
        .eq('id', id)

      if (exerciseError) throw exerciseError

      await supabase.from('exercise_primary_muscles').delete().eq('exercise_id', id)
      await supabase.from('exercise_synergist_muscles').delete().eq('exercise_id', id)
      await supabase.from('exercise_videos').delete().eq('exercise_id', id)

      if (data.primary_muscle_ids.length > 0) {
        const { error: pmError } = await supabase
          .from('exercise_primary_muscles')
          .insert(
            data.primary_muscle_ids.map((muscle_id) => ({
              exercise_id: id,
              muscle_id,
            })) as any
          )
        if (pmError) throw pmError
      }

      if (data.synergist_muscle_ids.length > 0) {
        const { error: smError } = await supabase
          .from('exercise_synergist_muscles')
          .insert(
            data.synergist_muscle_ids.map((muscle_id) => ({
              exercise_id: id,
              muscle_id,
            })) as any
          )
        if (smError) throw smError
      }

      if (data.videos.length > 0) {
        const { error: vidError } = await supabase
          .from('exercise_videos')
          .insert(
            data.videos.map((video) => ({
              exercise_id: id,
              url: video.url,
              title: video.title || null,
            })) as any
          )
        if (vidError) throw vidError
      }

      await fetchExercises()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error al actualizar ejercicio' }
    }
  }

  const deleteExercise = async (id: string) => {
    try {
      const { error } = await supabase.from('exercises').delete().eq('id', id)

      if (error) throw error

      await fetchExercises()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error al eliminar ejercicio' }
    }
  }

  return {
    exercises,
    loading,
    error,
    refetch: fetchExercises,
    createExercise,
    updateExercise,
    deleteExercise,
  }
}
