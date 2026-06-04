import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ExerciseDetail } from '../components/exercises/ExerciseDetail'
import { useAuth } from '../context/AuthContext'
import { useActiveRoutine } from '../hooks/useActiveRoutine'
import { useWorkoutLogs } from '../hooks/useWorkoutLogs'
import { useExercises } from '../hooks/useExercises'
import { useNextWorkout } from '../hooks/useNextWorkout'
import { getBlockColor } from '../lib/blockColors'
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
  const selectedAdminDayId = searchParams.get('day')
  const activeDayId = dayId || selectedAdminDayId || nextWorkoutInfo?.suggestedDay?.id
  const weekNumber = parseInt(searchParams.get('week') || String(nextWorkoutInfo?.currentWeek || 1))
  const shouldShowAdminDaySelector = isAdminProxy && !dayId && !selectedAdminDayId

  const [day, setDay] = useState<RoutineDayWithBlocks | null>(null)
  const [setInputs, setSetInputs] = useState<SetInput[]>([])
  const [studentNote, setStudentNote] = useState('')
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({})
  const [visibleExerciseNotes, setVisibleExerciseNotes] = useState<Set<string>>(new Set())
  const [expandedBlockIds, setExpandedBlockIds] = useState<Set<string>>(new Set())
  const [completedBlockIds, setCompletedBlockIds] = useState<Set<string>>(new Set())
  const [selectedWeekByExerciseId, setSelectedWeekByExerciseId] = useState<Record<string, number>>({})
  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithRelations | null>(null)
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false)
  const [exerciseModalSection, setExerciseModalSection] = useState<'photos' | undefined>(undefined)
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false)
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
        setSelectedWeekByExerciseId({})
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

  const getSelectedExerciseWeek = (blockExerciseId: string) => {
    return selectedWeekByExerciseId[blockExerciseId] || weekNumber
  }

  const selectExerciseWeek = (blockExerciseId: string, selectedWeek: number) => {
    setSelectedWeekByExerciseId(prev => ({
      ...prev,
      [blockExerciseId]: selectedWeek,
    }))
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

  const getLoggedSetForWeek = (selectedWeek: number, blockExerciseId: string, setNumber: number): LoggedSet | undefined => {
    const logForWeek = logs.find(log =>
      log.routine_day_id === day?.id &&
      log.week_number === selectedWeek &&
      log.logged_sets.some(loggedSet =>
        loggedSet.block_exercise_id === blockExerciseId &&
        loggedSet.set_number === setNumber
      )
    )

    return logForWeek?.logged_sets.find(loggedSet =>
      loggedSet.block_exercise_id === blockExerciseId &&
      loggedSet.set_number === setNumber
    )
  }

  const formatPrescribedSet = (set: { set_type: 'reps' | 'time'; quantity: number; weight_kg: number | null }) => {
    const quantity = set.set_type === 'time' ? `${set.quantity}"` : `${set.quantity} reps`
    return set.weight_kg !== null ? `${quantity} / ${set.weight_kg}kg` : quantity
  }

  const formatLoggedSet = (loggedSet: LoggedSet | undefined, setType: 'reps' | 'time') => {
    if (!loggedSet) return null

    const quantity = setType === 'time'
      ? (loggedSet.actual_seconds !== null ? `${loggedSet.actual_seconds}"` : null)
      : (loggedSet.actual_reps !== null ? `${loggedSet.actual_reps} reps` : null)
    const weight = loggedSet.actual_weight_kg !== null ? `${loggedSet.actual_weight_kg}kg` : null

    return [quantity, weight].filter(Boolean).join(' / ') || null
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

  const handleCompleteClick = () => {
    setConfirmCompleteOpen(true)
  }

  const handleConfirmComplete = async () => {
    if (!routine || !day || !user || !targetStudentId) return

    setSaving(true)
    setConfirmCompleteOpen(false)
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
        is_extra: nextWorkoutInfo?.suggestedDay?.id !== day.id,
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

  const handleAdminSelectDay = (selectedDayId: string) => {
    if (!studentId) return
    navigate(`/admin/students/${studentId}/register-workout?day=${selectedDayId}`)
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

  if (!routine || !nextWorkoutInfo?.hasActiveRoutine) {
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

  if (shouldShowAdminDaySelector) {
    const availableDays = [...routine.routine_days].sort((a, b) => a.day_number - b.day_number)

    return (
      <Layout>
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{routine.name}</h1>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                Semana {nextWorkoutInfo.currentWeek} de {routine.total_weeks}
              </span>
            </div>
            <p className="text-gray-600">
              Elegí qué día registrar para este alumno. Si registrás un día distinto al sugerido,
              queda en el historial sin avanzar la secuencia.
            </p>
          </div>

          {nextWorkoutInfo.suggestedDay && (
            <div className="bg-gray-900 text-white rounded-lg px-6 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-400">Día sugerido</p>
                  <h2 className="text-xl font-bold">
                    Día {nextWorkoutInfo.suggestedDayNumber}
                    {nextWorkoutInfo.suggestedDay.name && ` — ${nextWorkoutInfo.suggestedDay.name}`}
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="border-transparent shadow-sm hover:bg-gray-100"
                  onClick={() => handleAdminSelectDay(nextWorkoutInfo.suggestedDay!.id)}
                >
                  Registrar sugerido
                </Button>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-sm font-medium text-gray-700 mb-3">Todos los días de la rutina</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {availableDays.map(availableDay => {
                const isSuggested = nextWorkoutInfo.suggestedDay?.id === availableDay.id

                return (
                  <button
                    key={availableDay.id}
                    type="button"
                    onClick={() => handleAdminSelectDay(availableDay.id)}
                    className={`p-3 rounded-lg border text-left text-sm font-medium transition-colors ${
                      isSuggested
                        ? 'bg-gray-100 text-gray-900 border-gray-300'
                        : 'bg-white border-gray-200 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    Día {availableDay.day_number}
                    {isSuggested && <span className="ml-2 text-xs text-gray-500">sugerido</span>}
                    {availableDay.name && <span className="block text-xs text-gray-500 mt-1">{availableDay.name}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!day) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">No se encontró el día de entrenamiento</p>
          <Link to={isAdminProxy && studentId ? `/admin/students/${studentId}` : '/'}>
            <Button variant="secondary">Volver</Button>
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
            const blockColor = getBlockColor(block.block_letter)

            return (
              <div
                key={block.id}
                className={`${blockColor.bg} border ${blockColor.border} rounded-lg overflow-hidden ${
                  isCompleted ? 'ring-2 ring-green-200' : ''
                }`}
              >
                <div
                  className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer"
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
                      const selectedWeek = getSelectedExerciseWeek(exercise.id)
                      const isCurrentWeek = selectedWeek === weekNumber
                      const weekSets = exercise.prescribed_sets.filter(s => s.week_number === selectedWeek)
                      const weekNumbers = Array.from({ length: routine.total_weeks }, (_, index) => index + 1)
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

                      <div className="mb-3 overflow-x-auto">
                        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                          {weekNumbers.map(week => (
                            <button
                              key={week}
                              type="button"
                              onClick={() => selectExerciseWeek(exercise.id, week)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                                selectedWeek === week
                                  ? 'bg-white text-gray-900 shadow-sm'
                                  : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              Sem {week}
                            </button>
                          ))}
                        </div>
                      </div>

                      {!isCurrentWeek && (
                        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                          Solo lectura · Semana {selectedWeek}
                        </div>
                      )}

                      {/* Series */}
                      {isCurrentWeek ? (
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
                                  {formatPrescribedSet(set)}
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
                      ) : (
                        <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                          <div className="grid grid-cols-[3rem_1fr_1fr] gap-2 border-b border-gray-200 px-3 py-2 text-xs font-medium text-gray-500">
                            <div>Serie</div>
                            <div>Prescrito</div>
                            <div>Registrado</div>
                          </div>
                          <div className="divide-y divide-gray-200 bg-white">
                            {weekSets.map((set, idx) => {
                              const loggedSet = getLoggedSetForWeek(selectedWeek, exercise.id, set.set_number)
                              const loggedSetText = formatLoggedSet(loggedSet, set.set_type)

                              return (
                                <div
                                  key={set.id}
                                  className="grid grid-cols-[3rem_1fr_1fr] gap-2 px-3 py-2 text-sm"
                                >
                                  <div className="text-gray-400">{idx + 1}</div>
                                  <div className="text-gray-600">{formatPrescribedSet(set)}</div>
                                  <div className={loggedSetText ? 'font-medium text-gray-900' : 'text-gray-400'}>
                                    {loggedSetText || 'Sin registro'}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
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
            onClick={handleCompleteClick}
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

      <ConfirmDialog
        isOpen={confirmCompleteOpen}
        onClose={() => setConfirmCompleteOpen(false)}
        onConfirm={handleConfirmComplete}
        title="Finalizar entrenamiento"
        message="¿Confirmás que querés finalizar y guardar este entrenamiento? Una vez registrado, no se puede reabrir ni modificar desde la app."
        confirmText="Sí, finalizar"
        cancelText="Seguir registrando"
        variant="primary"
        loading={saving}
      />
    </Layout>
  )
}
