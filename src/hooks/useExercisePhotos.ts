import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ExercisePhoto } from '../lib/types'

const BUCKET = 'exercise-photos'
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function withPhotoPublicUrl(photo: ExercisePhoto): ExercisePhoto {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(photo.storage_path)
  return {
    ...photo,
    public_url: data.publicUrl,
  }
}

function getExtension(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'jpg' || extension === 'jpeg') return 'jpg'
  if (extension === 'png') return 'png'
  if (extension === 'webp') return 'webp'
  return null
}

function validatePhoto(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Formato no válido. Usá JPG, PNG o WebP.')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('La foto no puede superar los 5MB.')
  }

  const extension = getExtension(file)
  if (!extension) {
    throw new Error('Formato no válido. Usá JPG, PNG o WebP.')
  }

  return extension
}

export async function uploadExercisePhoto(exerciseId: string, file: File, order: 1 | 2 | 3) {
  const extension = validatePhoto(file)
  const storagePath = `exercises/${exerciseId}/${order}.${extension}`

  const { data: existingPhoto, error: existingError } = await supabase
    .from('exercise_photos')
    .select('*')
    .eq('exercise_id', exerciseId)
    .eq('display_order', order)
    .maybeSingle()

  if (existingError) throw existingError

  if (existingPhoto?.storage_path && existingPhoto.storage_path !== storagePath) {
    await supabase.storage.from(BUCKET).remove([existingPhoto.storage_path])
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    })

  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('exercise_photos')
    .upsert(
      {
        exercise_id: exerciseId,
        storage_path: storagePath,
        display_order: order,
      },
      { onConflict: 'exercise_id,display_order' }
    )
    .select()
    .single()

  if (error) throw error

  return withPhotoPublicUrl(data as ExercisePhoto)
}

export async function deleteExercisePhoto(photoId: string) {
  const { data: photo, error: fetchError } = await supabase
    .from('exercise_photos')
    .select('*')
    .eq('id', photoId)
    .single()

  if (fetchError) throw fetchError

  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([(photo as ExercisePhoto).storage_path])

  if (storageError) throw storageError

  const { error: deleteError } = await supabase
    .from('exercise_photos')
    .delete()
    .eq('id', photoId)

  if (deleteError) throw deleteError
}

export function useExercisePhotos() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadPhoto = async (exerciseId: string, file: File, order: 1 | 2 | 3) => {
    setLoading(true)
    setError(null)

    try {
      const photo = await uploadExercisePhoto(exerciseId, file, order)
      return { photo, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al subir foto'
      setError(message)
      return { photo: null, error: message }
    } finally {
      setLoading(false)
    }
  }

  const deletePhoto = async (photoId: string) => {
    setLoading(true)
    setError(null)

    try {
      await deleteExercisePhoto(photoId)
      return { error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar foto'
      setError(message)
      return { error: message }
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    uploadPhoto,
    deletePhoto,
  }
}
