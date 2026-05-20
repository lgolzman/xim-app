import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { ExerciseDetail } from '../components/exercises/ExerciseDetail'
import { useAuth } from '../context/AuthContext'
import { useActiveRoutine } from '../hooks/useActiveRoutine'
import { useWorkoutLogs } from '../hooks/useWorkoutLogs'
import { useExercises } from '../hooks/useExercises'
import { useNextWorkout } from '../hooks/useNextWorkout'
import type { CreateLoggedSetData } from '../hooks/useWorkoutLogs'
import type { BlockExerciseWithDetails, ExerciseWithRelations, LoggedSet, RoutineDayWithBlocks } from '../lib/types'

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
  const { dayId, studentId } = useParams<{ dayId?: string; studentId?: string }>()
  const [searchParams] = useSearchParams()

  const { user } = useAuth()
  const isAdminProxy = Boolean(studentId)
  const targetStudentId = isAdminProxy ? studentId : user?.id
  const { info: nextWorkoutInfo, loading: nextWorkoutLoading } = useNextWorkout(isAdminProxy ? studentId : undefined)
  const { routine, loading: routineLoading } = useActiveRoutine(targetStudentId)
  const { logs, createWorkoutLog } = useWorkoutLogs(targetStudentId, routine?.id)
  const { exercises } = useExercises()
  const activeDayId = dayId || nextWorkoutInfo?.suggestedDay?.id
  const weekNumber = parseInt(searchParams.get('week') || String(nextWorkoutInfo?.currentWeek || 1))

  const [day, setDay] = useState<RoutineDayWithBlocks | null>(null)
  const [setInputs, setSetInputs] = useState<SetInput[]>([])
  const [studentNote, setStudentNote] = useState('')
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({})
  const [visibleExerciseNotes, setVisibleExerciseNotes] = useState<Set<string>>(new Set())
  const [expandedBlockIds, setExpandedBlockIds] = useState<Set<string>>(new Set())
  const [completedBlockIds, setCompletedBlockIds] = useState<Set<string>>(new Set())
  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithRelations | null>(null)
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false)
  const [exerciseModalSection, setExerciseModalSection] = useState<'photos' | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Inicializar datos del día cuando carga la rutina
  useEffect(() => {
    if (!routineLoading && !nextWorkoutLoading && activeDayId) {
      const dayData = routine?.routine_days.find(d => d.id === activeDayId)
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
        setExerciseNotes({})
        setVisibleExerciseNotes(new Set())
        setExpandedBlockIds(new Set(dayData.routine_blocks[0] ? [dayData.routine_blocks[0].id] : []))
        setCompletedBlockIds(new Set())
      }
    }
  }, [routineLoading, nextWorkoutLoading, routine, activeDayId, weekNumber])

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

  const getPreviousLoggedSet = (blockExerciseId: string, setNumber: number): LoggedSet | undefined => {
    const previousLogForDay = day
      ? logs.find(log => log.routine_day_id === day.id)
      : null

    return previousLogForDay?.logged_sets.find(
      loggedSet => loggedSet.block_exercise_id === blockExerciseId && loggedSet.set_number === setNumber
    )
  }

  const formatPreviousLoggedSet = (loggedSet: LoggedSet | undefined) => {
    if (!loggedSet) return null

    const parts: string[] = []

    if (loggedSet.actual_reps !== null) {
      parts.push(`${loggedSet.actual_reps} reps`)
    }

    if (loggedSet.actual_seconds !== null) {
      parts.push(`${loggedSet.actual_seconds} seg`)
    }

    if (loggedSet.actual_weight_kg !== null) {
      parts.push(`${loggedSet.actual_weight_kg}kg`)
    }

    return parts.length > 0 ? parts.join(' / ') : null
  }

  const toggleExerciseNote = (blockExerciseId: string) => {
    setVisibleExerciseNotes(prev => {
      const next = new Set(prev)
      if (next.has(blockExerciseId)) {
        next.delete(blockExerciseId)
      } else {
        next.add(blockExerciseId)
      }
      return next
    })
  }

  const toggleBlockExpanded = (blockId: string) => {
    setExpandedBlockIds(prev => {
      const next = new Set(prev)
      if (next.has(blockId)) {
        next.delete(blockId)
      } else {
        next.add(blockId)
      }
      return next
    })
  }

  const completeBlock = (blockId: string) => {
    if (!day) return

    const currentIndex = day.routine_blocks.findIndex(block => block.id === blockId)
    const nextBlock = currentIndex >= 0 ? day.routine_blocks[currentIndex + 1] : undefined

    setCompletedBlockIds(prev => new Set(prev).add(blockId))
    setExpandedBlockIds(prev => {
      const next = new Set(prev)
      next.delete(blockId)
      if (nextBlock) {
        next.add(nextBlock.id)
      }
      return next
    })
  }

  const openExerciseDetail = (blockExercise: BlockExerciseWithDetails, initialSection?: 'photos') => {
    const exercise = exercises.find(ex => ex.id === blockExercise.exercise_id)

    if (exercise) {
      setSelectedExercise(exercise)
    } else {
      setSelectedExercise({
        ...blockExercise.exercise,
        movement_pattern: blockExercise.exercise.movement_pattern ?? null,
        direction: blockExercise.exercise.direction ?? null,
        primary_muscles: [],
        synergist_muscles: [],
        videos: blockExercise.exercise.videos || [],
        photos: blockExercise.exercise.photos || [],
      })
    }

    setExerciseModalSection(initialSection)
    setExerciseModalOpen(true)
  }

  const handleComplete = async () => {
    if (!routine || !day || !user || !targetStudentId) return

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

      const exerciseNotesToSave = Object.entries(exerciseNotes)
        .map(([blockExerciseId, note]) => ({
          block_exercise_id: blockExerciseId,
          note: note.trim(),
        }))
        .filter(note => note.note.length > 0)

      const { error: createError } = await createWorkoutLog({
        routine_id: routine.id,
        routine_day_id: day.id,
        week_number: weekNumber,
        student_note: studentNote || undefined,
        logged_sets: loggedSets,
        exercise_notes: exerciseNotesToSave,
      }, targetStudentId, user.id)

      if (createError) {
        setError(createError)
        return
      }

      navigate(isAdminProxy && studentId ? `/admin/students/${studentId}` : '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar entrenamiento')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigate(-1)
  }

  if (routineLoading || nextWorkoutLoading) {
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
            <Button
              type="button"
              variant="ghost"
              className="text-white hover:bg-gray-800"
              onClick={handleCancel}
            >
              Cancelar
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Bloques y ejercicios */}
        <div className="space-y-6">
          {day.routine_blocks.map(block => {
            const isExpanded = expandedBlockIds.has(block.id)
            const isCompleted = completedBlockIds.has(block.id)

            return (
              <div
                key={block.id}
                className={`bg-white border rounded-lg overflow-hidden ${
                  isCompleted ? 'border-green-200' : 'border-gray-200'
                }`}
              >
                <div
                  className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer ${
                    isCompleted ? 'bg-green-50' : 'bg-gray-100'
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onClick={() => toggleBlockExpanded(block.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleBlockExpanded(block.id)
                    }
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-gray-500 w-4" aria-hidden="true">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    {isCompleted && (
                      <span className="text-green-700 font-semibold" aria-label="Bloque terminado">
                        ✓
                      </span>
                    )}
                    <span className="font-semibold text-gray-900">Bloque {block.block_letter}</span>
                    {block.block_exercises.length > 1 && (
                      <span className="text-xs px-2 py-0.5 bg-gray-200 rounded text-gray-600">superset</span>
                    )}
                  </div>
                  {isExpanded && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        completeBlock(block.id)
                      }}
                    >
                      ✓ Terminé este bloque
                    </Button>
                  )}
                </div>

                {isExpanded && (
                  <div className="divide-y divide-gray-100">
                    {block.block_exercises.map(exercise => {
                      const weekSets = exercise.prescribed_sets.filter(s => s.week_number === weekNumber)
                      const videos = exercise.exercise?.videos || []
                      const photos = exercise.exercise?.photos || []

                      return (
                        <div key={exercise.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="text-xs text-gray-500 font-medium">
                            {block.block_letter}{exercise.position}
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openExerciseDetail(exercise)}
                              className="text-left font-semibold text-gray-900 hover:text-blue-700 hover:underline"
                            >
                              {exercise.exercise?.name}
                            </button>
                            {photos.length > 0 && (
                              <button
                                type="button"
                                onClick={() => openExerciseDetail(exercise, 'photos')}
                                className="inline-flex items-center rounded-md border border-gray-300 px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                Fotos
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleExerciseNote(exercise.id)}
                              className={`relative inline-flex h-7 w-7 items-center justify-center rounded-full text-sm transition-colors ${
                                exerciseNotes[exercise.id]?.trim()
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                              }`}
                              aria-label="Agregar nota del ejercicio"
                              title="Nota del ejercicio"
                            >
                              💬
                              {exerciseNotes[exercise.id]?.trim() && (
                                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
                              )}
                            </button>
                            {videos.map((video, index) => (
                              <a
                                key={video.id}
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center rounded-md border border-blue-200 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                                title={video.title || `Video ${index + 1}`}
                              >
                                Video{videos.length > 1 ? ` ${index + 1}` : ''}
                              </a>
                            ))}
                          </div>
                          {exercise.note && (
                            <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                              <span>📝</span> {exercise.note}
                            </p>
                          )}
                          {visibleExerciseNotes.has(exercise.id) && (
                            <textarea
                              value={exerciseNotes[exercise.id] || ''}
                              onChange={(e) => setExerciseNotes(prev => ({
                                ...prev,
                                [exercise.id]: e.target.value,
                              }))}
                              placeholder="Nota sobre este ejercicio"
                              className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                              rows={2}
                            />
                          )}
                        </div>
                      </div>

                      {/* Series */}
                      <div className="space-y-2">
                        {weekSets.map((set, idx) => {
                          const input = getSetInput(exercise.id, set.set_number)
                          const isTimeSet = set.set_type === 'time'
                          const previousLoggedSet = getPreviousLoggedSet(exercise.id, set.set_number)
                          const previousLoggedSetText = formatPreviousLoggedSet(previousLoggedSet)

                          return (
                            <div key={set.id} className="flex items-start gap-2">
                              <span className="text-sm text-gray-400 w-8 pt-2">{idx + 1}.</span>

                              {/* Prescrito */}
                              <span className="text-sm text-gray-500 w-24 pt-2">
                                {isTimeSet ? `${set.quantity}"` : `${set.quantity} reps`}
                                {set.weight_kg && ` / ${set.weight_kg}kg`}
                              </span>

                              <div className="space-y-1">
                                {previousLoggedSetText && (
                                  <p className="text-xs text-gray-400">
                                    anterior: {previousLoggedSetText}
                                  </p>
                                )}

                                <div className="flex items-center gap-2">
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
                              </div>
                            </div>
                          )
                        })}
                      </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
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

      <Modal
        isOpen={exerciseModalOpen}
        onClose={() => {
          setExerciseModalOpen(false)
          setExerciseModalSection(undefined)
        }}
        title={selectedExercise?.name || ''}
        size="lg"
      >
        {selectedExercise && (
          <ExerciseDetail
            exercise={selectedExercise}
            onEdit={() => undefined}
            onDelete={() => undefined}
            onClose={() => {
              setExerciseModalOpen(false)
              setExerciseModalSection(undefined)
            }}
            showAdminActions={false}
            initialSection={exerciseModalSection}
          />
        )}
      </Modal>
    </Layout>
  )
}
