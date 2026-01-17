import { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { MultiSelect } from '../ui/MultiSelect'
import { TextArea } from '../ui/TextArea'
import { useMovementPatterns } from '../../hooks/useMovementPatterns'
import { useDirections } from '../../hooks/useDirections'
import { useMuscles } from '../../hooks/useMuscles'
import type { ExerciseFormData, ExerciseWithRelations, ChainType } from '../../lib/types'

interface ExerciseFormProps {
  exercise?: ExerciseWithRelations | null
  onSubmit: (data: ExerciseFormData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function ExerciseForm({ exercise, onSubmit, onCancel, loading }: ExerciseFormProps) {
  const { patterns } = useMovementPatterns()
  const { directions } = useDirections()
  const { muscles } = useMuscles()

  const [name, setName] = useState('')
  const [movementPatternId, setMovementPatternId] = useState('')
  const [directionId, setDirectionId] = useState('')
  const [chainType, setChainType] = useState<ChainType | ''>('')
  const [executionTips, setExecutionTips] = useState('')
  const [primaryMuscleIds, setPrimaryMuscleIds] = useState<string[]>([])
  const [synergistMuscleIds, setSynergistMuscleIds] = useState<string[]>([])
  const [videos, setVideos] = useState<{ url: string; title: string }[]>([])

  useEffect(() => {
    if (exercise) {
      setName(exercise.name)
      setMovementPatternId(exercise.movement_pattern_id || '')
      setDirectionId(exercise.direction_id || '')
      setChainType(exercise.chain_type || '')
      setExecutionTips(exercise.execution_tips || '')
      setPrimaryMuscleIds(exercise.primary_muscles.map((m) => m.id))
      setSynergistMuscleIds(exercise.synergist_muscles.map((m) => m.id))
      setVideos(exercise.videos.map((v) => ({ url: v.url, title: v.title || '' })))
    }
  }, [exercise])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await onSubmit({
      name,
      movement_pattern_id: movementPatternId,
      direction_id: directionId,
      chain_type: chainType as ChainType | null,
      execution_tips: executionTips,
      primary_muscle_ids: primaryMuscleIds,
      synergist_muscle_ids: synergistMuscleIds,
      videos: videos.filter((v) => v.url.trim()),
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
