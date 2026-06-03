import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { ExerciseWithRelations, ExerciseFormData, Exercise } from '../lib/types'
import { deleteExercisePhoto, uploadExercisePhoto, withPhotoPublicUrl } from './useExercisePhotos'

const buildExercisePayload = (data: ExerciseFormData) => ({
  name: data.name.trim(),
  movement_pattern_id: data.movement_pattern_id || null,
  direction_id: data.direction_id || null,
  chain_type: data.chain_type || null,
  execution_tips: data.execution_tips.trim() || null,
})

export function useExercises() {
  const [exercises, setExercises] = useState<ExerciseWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(false)

  const fetchExercises = useCallback(async () => {
    if (!isMountedRef.current) return
    setLoading(true)
    setError(null)

    try {
      const exercisesQuery = supabase
        .from('exercises')
        .select(`
          *,
          movement_pattern:movement_patterns(*),
          direction:directions(*)
        `)
        .order('name')

      const { data: exercisesData, error: exercisesError } = await exercisesQuery

      if (exercisesError) throw exercisesError

      const exercisesWithMuscles = await Promise.all(
        (exercisesData || []).map(async (exercise: any) => {
          const primaryMusclesQuery = supabase
            .from('exercise_primary_muscles')
            .select('muscle:muscles(*)')
            .eq('exercise_id', exercise.id)
          const synergistMusclesQuery = supabase
            .from('exercise_synergist_muscles')
            .select('muscle:muscles(*)')
            .eq('exercise_id', exercise.id)
          const videosQuery = supabase
            .from('exercise_videos')
            .select('*')
            .eq('exercise_id', exercise.id)
          const photosQuery = supabase
            .from('exercise_photos')
            .select('*')
            .eq('exercise_id', exercise.id)
            .order('display_order')

          const [primaryMuscles, synergistMuscles, videos, photos] = await Promise.all([
            primaryMusclesQuery,
            synergistMusclesQuery,
            videosQuery,
            photosQuery,
          ])

          return {
            ...exercise,
            primary_muscles: primaryMuscles.data?.map((pm: any) => pm.muscle) || [],
            synergist_muscles: synergistMuscles.data?.map((sm: any) => sm.muscle) || [],
            videos: videos.data || [],
            photos: photos.data?.map(withPhotoPublicUrl) || [],
          } as ExerciseWithRelations
        })
      )

      if (!isMountedRef.current) return
      setExercises(exercisesWithMuscles)
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error && err.name === 'AbortError'
        ? 'La solicitud tardó demasiado. Intenta recargar la página.'
        : err instanceof Error ? err.message : 'Error al cargar ejercicios')
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    fetchExercises()
    return () => {
      isMountedRef.current = false
    }
  }, [fetchExercises])

  const createExercise = async (data: ExerciseFormData) => {
    try {
      const { data: exerciseResult, error: exerciseError } = await supabase
        .from('exercises')
        .insert(buildExercisePayload(data))
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

      for (const photo of data.photos) {
        await uploadExercisePhoto(newExercise.id, photo.file, photo.order)
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
        .update(buildExercisePayload(data))
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

      for (const photoId of data.deleted_photo_ids) {
        await deleteExercisePhoto(photoId)
      }

      for (const photo of data.photos) {
        await uploadExercisePhoto(id, photo.file, photo.order)
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
