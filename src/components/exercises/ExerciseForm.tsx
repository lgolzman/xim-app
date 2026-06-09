import { useState, useEffect, useRef } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { MultiSelect } from '../ui/MultiSelect'
import { TextArea } from '../ui/TextArea'
import type { ExerciseFormData, ExercisePhoto, ExerciseWithRelations, ChainType, MovementPattern, Muscle } from '../../lib/types'
import type { Direction } from '../../lib/types'

interface ExerciseFormProps {
  exercise?: ExerciseWithRelations | null
  onSubmit: (data: ExerciseFormData) => Promise<void>
  onCancel: () => void
  loading?: boolean
  patterns: MovementPattern[]
  directions: Direction[]
  muscles: Muscle[]
  initialName?: string
  initialMovementPatternId?: string
  initialDirectionId?: string
  initialChainType?: ChainType | ''
}

interface PhotoSlot {
  order: 1 | 2 | 3
  existingPhoto: ExercisePhoto | null
  file: File | null
  previewUrl: string | null
  deleted: boolean
  error: string | null
}

const PHOTO_ORDERS: Array<1 | 2 | 3> = [1, 2, 3]
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_SIZE = 5 * 1024 * 1024

export function ExerciseForm({
  exercise,
  onSubmit,
  onCancel,
  loading,
  patterns,
  directions,
  muscles,
  initialName = '',
  initialMovementPatternId = '',
  initialDirectionId = '',
  initialChainType = '',
}: ExerciseFormProps) {

  const [name, setName] = useState('')
  const [movementPatternId, setMovementPatternId] = useState('')
  const [directionId, setDirectionId] = useState('')
  const [chainType, setChainType] = useState<ChainType | ''>('')
  const [executionTips, setExecutionTips] = useState('')
  const [primaryMuscleIds, setPrimaryMuscleIds] = useState<string[]>([])
  const [synergistMuscleIds, setSynergistMuscleIds] = useState<string[]>([])
  const [videos, setVideos] = useState<{ url: string; title: string }[]>([])
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>(
    PHOTO_ORDERS.map((order) => ({
      order,
      existingPhoto: null,
      file: null,
      previewUrl: null,
      deleted: false,
      error: null,
    }))
  )
  const photoSlotsRef = useRef(photoSlots)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    photoSlotsRef.current = photoSlots
  }, [photoSlots])

  useEffect(() => {
    photoSlotsRef.current.forEach((slot) => {
      if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl)
    })

    if (exercise) {
      setName(exercise.name)
      setMovementPatternId(exercise.movement_pattern_id || '')
      setDirectionId(exercise.direction_id || '')
      setChainType(exercise.chain_type || '')
      setExecutionTips(exercise.execution_tips || '')
      setPrimaryMuscleIds(exercise.primary_muscles.map((m) => m.id))
      setSynergistMuscleIds(exercise.synergist_muscles.map((m) => m.id))
      setVideos(exercise.videos.map((v) => ({ url: v.url, title: v.title || '' })))
      setPhotoSlots(PHOTO_ORDERS.map((order) => ({
        order,
        existingPhoto: exercise.photos.find((photo) => photo.display_order === order) || null,
        file: null,
        previewUrl: null,
        deleted: false,
        error: null,
      })))
    } else {
      setName(initialName)
      setMovementPatternId(initialMovementPatternId)
      setDirectionId(initialDirectionId)
      setChainType(initialChainType)
      setExecutionTips('')
      setPrimaryMuscleIds([])
      setSynergistMuscleIds([])
      setVideos([])
      setPhotoSlots(PHOTO_ORDERS.map((order) => ({
        order,
        existingPhoto: null,
        file: null,
        previewUrl: null,
        deleted: false,
        error: null,
      })))
    }
  }, [exercise, initialChainType, initialDirectionId, initialMovementPatternId, initialName])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    return () => {
      photoSlotsRef.current.forEach((slot) => {
        if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl)
      })
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await onSubmit({
      name: name.trim(),
      movement_pattern_id: movementPatternId,
      direction_id: directionId,
      chain_type: chainType === '' ? null : chainType,
      execution_tips: executionTips.trim(),
      primary_muscle_ids: primaryMuscleIds,
      synergist_muscle_ids: synergistMuscleIds,
      videos: videos.filter((v) => v.url.trim()),
      photos: photoSlots
        .filter((slot) => slot.file)
        .map((slot) => ({ file: slot.file as File, order: slot.order })),
      deleted_photo_ids: photoSlots
        .filter((slot) => slot.deleted && slot.existingPhoto)
        .map((slot) => (slot.existingPhoto as ExercisePhoto).id),
    })
  }

  const addVideo = () => {
    setVideos([...videos, { url: '', title: '' }])
  }

  const updateVideo = (index: number, field: 'url' | 'title', value: string) => {
    const newVideos = [...videos]
    newVideos[index][field] = value
    setVideos(newVideos)
  }

  const removeVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index))
  }

  const validatePhoto = (file: File) => {
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      return 'Usá JPG, PNG o WebP.'
    }

    if (file.size > MAX_PHOTO_SIZE) {
      return 'Máximo 5MB por foto.'
    }

    return null
  }

  const setPhotoFile = (order: 1 | 2 | 3, file: File | null) => {
    setPhotoSlots((currentSlots) => currentSlots.map((slot) => {
      if (slot.order !== order) return slot

      if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl)
      if (!file) {
        return {
          ...slot,
          file: null,
          previewUrl: null,
          deleted: Boolean(slot.existingPhoto),
          error: null,
        }
      }

      const validationError = validatePhoto(file)
      if (validationError) {
        return {
          ...slot,
          file: null,
          previewUrl: null,
          error: validationError,
        }
      }

      return {
        ...slot,
        file,
        previewUrl: URL.createObjectURL(file),
        deleted: Boolean(slot.existingPhoto),
        error: null,
      }
    }))
  }

  const handlePhotoInput = (order: 1 | 2 | 3, fileList: FileList | null) => {
    const file = fileList?.[0]
    if (file) setPhotoFile(order, file)
  }

  const muscleOptions = muscles.map((m) => ({ value: m.id, label: m.name }))
  const patternOptions = patterns.map((p) => ({ value: p.id, label: p.name }))
  const directionOptions = directions.map((d) => ({ value: d.id, label: d.name }))

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Nombre del ejercicio"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="Ej: Press de banca"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Patrón de movimiento"
          options={patternOptions}
          value={movementPatternId}
          onChange={(e) => setMovementPatternId(e.target.value)}
          placeholder="Seleccionar patrón"
        />

        <Select
          label="Dirección"
          options={directionOptions}
          value={directionId}
          onChange={(e) => setDirectionId(e.target.value)}
          placeholder="Seleccionar dirección"
        />
      </div>

      <Select
        label="Tipo de cadena"
        options={[
          { value: 'cerrada', label: 'Cadena cerrada' },
          { value: 'abierta', label: 'Cadena abierta' },
        ]}
        value={chainType}
        onChange={(e) => setChainType(e.target.value as ChainType | '')}
        placeholder="Seleccionar tipo"
      />

      <MultiSelect
        label="Músculos principales"
        options={muscleOptions}
        value={primaryMuscleIds}
        onChange={setPrimaryMuscleIds}
        placeholder="Seleccionar músculos principales"
      />

      <MultiSelect
        label="Músculos sinergistas"
        options={muscleOptions}
        value={synergistMuscleIds}
        onChange={setSynergistMuscleIds}
        placeholder="Seleccionar músculos sinergistas"
      />

      <TextArea
        label="Tips de ejecución"
        value={executionTips}
        onChange={(e) => setExecutionTips(e.target.value)}
        placeholder="Escribe consejos para la correcta ejecución del ejercicio..."
        rows={4}
      />

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Fotos de referencia
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {photoSlots.map((slot) => {
            const imageUrl = slot.previewUrl || (!slot.deleted ? slot.existingPhoto?.public_url : null)
            const inputId = `exercise-photo-${slot.order}`

            return (
              <div key={slot.order} className="space-y-2">
                <div
                  className="relative flex min-h-36 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-center"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    setPhotoFile(slot.order, e.dataTransfer.files[0] || null)
                  }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`Foto ${slot.order}`}
                      className="h-32 w-full rounded-md object-cover"
                    />
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Foto {slot.order}</p>
                      <p className="text-xs text-gray-500">JPG, PNG o WebP hasta 5MB</p>
                      <label
                        htmlFor={inputId}
                        className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-100"
                      >
                        Subir foto
                      </label>
                    </div>
                  )}
                  <input
                    id={inputId}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => handlePhotoInput(slot.order, e.target.files)}
                  />
                </div>
                {imageUrl && (
                  <div className="flex gap-2">
                    <label
                      htmlFor={inputId}
                      className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cambiar
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPhotoFile(slot.order, null)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      Eliminar
                    </Button>
                  </div>
                )}
                {slot.error && (
                  <p className="text-xs text-red-600">{slot.error}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Videos de referencia
          </label>
          <Button type="button" variant="ghost" size="sm" onClick={addVideo}>
            + Agregar video
          </Button>
        </div>

        {videos.map((video, index) => (
          <div key={index} className="flex gap-2 items-start">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                placeholder="URL del video"
                value={video.url}
                onChange={(e) => updateVideo(index, 'url', e.target.value)}
              />
              <Input
                placeholder="Título (opcional)"
                value={video.title}
                onChange={(e) => updateVideo(index, 'title', e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeVideo(index)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        ))}

        {videos.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-2">
            No hay videos agregados
          </p>
        )}
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || !name.trim()}>
          {loading ? 'Guardando...' : exercise ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  )
}
