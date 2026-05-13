import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'
import { useActiveRoutine } from '../hooks/useActiveRoutine'
import { useWorkoutLogs } from '../hooks/useWorkoutLogs'
import type { CreateLoggedSetData } from '../hooks/useWorkoutLogs'
import type { RoutineDayWithBlocks, BlockExerciseWithDetails } from '../lib/types'

interface SetInput {
  block_exercise_id: string
  set_number: number
  set_type: 'reps' | 'time'
  prescribed_quantity: number
  prescribed_weight: number | null
  actual_reps: string
  actual_weight: string
  actual_seconds: string
}

export function WorkoutExecution() {
  const navigate = useNavigate()
  const { dayId } = useParams<{ dayId: string }>()
  const [searchParams] = useSearchParams()
  const weekNumber = parseInt(searchParams.get('week') || '1')

  const { user } = useAuth()
  const { routine, loading: routineLoading, getDayById } = useActiveRoutine(user?.id)
  const { createWorkoutLog } = useWorkoutLogs(user?.id, routine?.id)

  const [day, setDay] = useState<RoutineDayWithBlocks | null>(null)
  const [setInputs, setSetInputs] = useState<SetInput[]>([])
  const [studentNote, setStudentNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<BlockExerciseWithDetails | null>(null)

  // Inicializar datos del día cuando carga la rutina
  useEffect(() => {
    if (!routineLoading && dayId) {
      const dayData = getDayById(dayId)
      if (dayData) {
        setDay(dayData)

        // Crear inputs para cada serie prescrita de la semana actual
        const inputs: SetInput[] = []
        dayData.routine_blocks.forEach(block => {
          block.block_exercises.forEach(exercise => {
            const weekSets = exercise.prescribed_sets.filter(s => s.week_number === weekNumber)
            weekSets.forEach(set => {
              inputs.push({
                block_exercise_id: exercise.id,
                set_number: set.set_number,
                set_type: set.set_type,
                prescribed_quantity: set.quantity,
                prescribed_weight: set.weight_kg,
                actual_reps: '',
                actual_weight: '',
                actual_seconds: '',
              })
            })
          })
        })
        setSetInputs(inputs)
      }
    }
  }, [routineLoading, dayId, getDayById, weekNumber])

  const updateSetInput = (blockExerciseId: string, setNumber: number, field: string, value: string) => {
    setSetInputs(prev =>
      prev.map(input => {
        if (input.block_exercise_id === blockExerciseId && input.set_number === setNumber) {
          return { ...input, [field]: value }
        }
        return input
      })
    )
  }

  const getSetInput = (blockExerciseId: string, setNumber: number): SetInput | undefined => {
    return setInputs.find(
      input => input.block_exercise_id === blockExerciseId && input.set_number === setNumber
    )
  }

  const handleComplete = async () => {
    if (!routine || !day || !user) return

    setSaving(true)
    setError(null)

    try {
      // Preparar logged sets solo con los que tienen datos
      const loggedSets: CreateLoggedSetData[] = []

      for (const input of setInputs) {
        const actualReps = input.actual_reps ? parseInt(input.actual_reps) : undefined
        const actualWeight = input.actual_weight ? parseFloat(input.actual_weight) : undefined
        const actualSeconds = input.actual_seconds ? parseInt(input.actual_seconds) : undefined

        // Solo incluir si hay al menos un dato
        if (actualReps || actualWeight || actualSeconds) {
          loggedSets.push({
            block_exercise_id: input.block_exercise_id,
            set_number: input.set_number,
            actual_reps: input.set_type === 'reps' ? actualReps : undefined,
            actual_weight_kg: actualWeight,
            actual_seconds: input.set_type === 'time' ? actualSeconds : undefined,
          })
        }
      }

      const { error: createError } = await createWorkoutLog({
        routine_id: routine.id,
        routine_day_id: day.id,
        week_number: weekNumber,
        student_note: studentNote || undefined,
        logged_sets: loggedSets,
      }, user.id)

      if (createError) {
        setError(createError)
        setSaving(false)
        return
      }

      // Redirigir al home
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar entrenamiento')
      setSaving(false)
    }
  }

  const openVideoModal = (exercise: BlockExerciseWithDetails) => {
    setSelectedExercise(exercise)
    setVideoModalOpen(true)
  }

  if (routineLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    )
  }

  if (!routine || !day) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">No se encontró el día de entrenamiento</p>
          <Link to="/">
            <Button variant="secondary">Volver al inicio</Button>
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gray-900 text-white rounded-lg px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">
                {routine.name} — Semana {weekNumber}
              </p>
              <h1 className="text-xl font-bold">
                Día {day.day_number}
                {day.name && ` — ${day.name}`}
              </h1>
            </div>
            <Link to="/">
              <Button variant="ghost" className="text-white hover:bg-gray-800">
                Cancelar
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Bloques y ejercicios */}
        <div className="space-y-6">
          {day.routine_blocks.map(block => (
            <div key={block.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 flex items-center gap-2">
                <span className="font-semibold text-gray-900">Bloque {block.block_letter}</span>
                {block.block_exercises.length > 1 && (
                  <span className="text-xs px-2 py-0.5 bg-gray-200 rounded text-gray-600">superset</span>
                )}
              </div>

              <div className="divide-y divide-gray-100">
                {block.block_exercises.map(exercise => {
                  const weekSets = exercise.prescribed_sets.filter(s => s.week_number === weekNumber)

                  return (
                    <div key={exercise.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="text-xs text-gray-500 font-medium">
                            {block.block_letter}{exercise.position}
                          </span>
                          <h3 className="font-semibold text-gray-900">{exercise.exercise?.name}</h3>
                          {exercise.note && (
                            <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                              <span>📝</span> {exercise.note}
                            </p>
                          )}
                        </div>
                        {(exercise.exercise as any)?.videos?.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openVideoModal(exercise)}
                          >
                            📹 Ver video
                          </Button>
                        )}
                      </div>

                      {/* Series */}
                      <div className="space-y-2">
                        {weekSets.map((set, idx) => {
                          const input = getSetInput(exercise.id, set.set_number)
                          const isTimeSet = set.set_type === 'time'

                          return (
                            <div key={set.id} className="flex items-center gap-2">
                              <span className="text-sm text-gray-400 w-8">{idx + 1}.</span>

                              {/* Prescrito */}
                              <span className="text-sm text-gray-500 w-24">
                                {isTimeSet ? `${set.quantity}"` : `${set.quantity} reps`}
                                {set.weight_kg && ` / ${set.weight_kg}kg`}
                              </span>

                              {/* Input de reps/tiempo */}
                              <Input
                                type="number"
                                value={isTimeSet ? input?.actual_seconds || '' : input?.actual_reps || ''}
                                onChange={(e) => updateSetInput(
                                  exercise.id,
                                  set.set_number,
                                  isTimeSet ? 'actual_seconds' : 'actual_reps',
                                  e.target.value
                                )}
                                placeholder={isTimeSet ? 'seg' : 'reps'}
                                className="w-20"
                                min={0}
                              />

                              {/* Input de peso (solo si hay peso prescrito) */}
                              {set.weight_kg !== null && (
                                <Input
                                  type="number"
                                  step="0.5"
                                  value={input?.actual_weight || ''}
                                  onChange={(e) => updateSetInput(
                                    exercise.id,
                                    set.set_number,
                                    'actual_weight',
                                    e.target.value
                                  )}
                                  placeholder="kg"
                                  className="w-20"
                                  min={0}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Notas del entrenamiento */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas del entrenamiento (opcional)
          </label>
          <textarea
            value={studentNote}
            onChange={(e) => setStudentNote(e.target.value)}
            placeholder="Escribí cualquier observación: cómo te sentiste, si tuviste dolor, etc."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        {/* Botón de completar */}
        <div className="sticky bottom-4">
          <Button
            onClick={handleComplete}
            disabled={saving}
            className="w-full py-4 text-lg font-semibold"
          >
            {saving ? 'Guardando...' : 'Marcar como completado'}
          </Button>
        </div>
      </div>

      {/* Modal de video */}
      <Modal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        title={selectedExercise?.exercise?.name || 'Video'}
        size="lg"
      >
        {selectedExercise && (selectedExercise.exercise as any)?.videos?.length > 0 && (
          <div className="space-y-4">
            {(selectedExercise.exercise as any).videos.map((video: any) => (
              <div key={video.id}>
                {video.title && <p className="text-sm text-gray-600 mb-2">{video.title}</p>}
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {video.url}
                </a>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </Layout>
  )
}
