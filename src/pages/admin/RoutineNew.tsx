import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Layout } from '../../components/layout/Layout'
import { RoutineForm } from '../../components/admin/RoutineForm'
import type { RoutineFormData } from '../../components/admin/RoutineForm'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { useRoutines } from '../../hooks/useRoutines'
import type { CreateRoutineData, UpdateRoutineData } from '../../hooks/useRoutines'
import { useAuth } from '../../context/AuthContext'
import type { RoutineWithDays, RoutineWithStudent, PrescribedSet } from '../../lib/types'

export function RoutineNew() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const studentId = searchParams.get('studentId') || undefined
  const { user } = useAuth()
  const { routines, loading: routinesLoading, createRoutine, updateRoutine, updateRoutineStatus, getRoutineWithDetails } = useRoutines()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copyModalOpen, setCopyModalOpen] = useState(false)
  const [selectedRoutineId, setSelectedRoutineId] = useState('')
  const [copyStudentFilterId, setCopyStudentFilterId] = useState('')
  const [copying, setCopying] = useState(false)
  const [initialFormData, setInitialFormData] = useState<RoutineFormData | undefined>(undefined)
  const [currentFormData, setCurrentFormData] = useState<RoutineFormData | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [autoSavedRoutineId, setAutoSavedRoutineId] = useState<string | null>(null)
  const [dismissedDraftId, setDismissedDraftId] = useState<string | null>(null)

  const selectedStudentId = currentFormData?.student_id || initialFormData?.student_id || studentId
  const existingDraft = selectedStudentId
    ? routines.find(routine =>
        routine.student_id === selectedStudentId &&
        routine.status === 'draft' &&
        routine.id !== autoSavedRoutineId &&
        routine.id !== dismissedDraftId
      )
    : null

  const handleSubmit = async (formData: RoutineFormData, action: 'draft' | 'active') => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      let routineId = autoSavedRoutineId

      if (routineId) {
        const { error: updateError } = await updateRoutine(routineId, formDataToUpdateRoutineData(formData))
        if (updateError) {
          setError(updateError)
          setLoading(false)
          return
        }
      } else {
        const { data: routine, error: createError } = await createRoutine(formDataToCreateRoutineData(formData), user.id)
        if (createError || !routine) {
          setError(createError || 'No se pudo crear la rutina')
          setLoading(false)
          return
        }
        routineId = routine.id
        setAutoSavedRoutineId(routine.id)
      }

      if (routineId && action === 'active') {
        const { error: activateError } = await updateRoutineStatus(routineId, 'active')
        if (activateError) {
          setError(activateError)
          setLoading(false)
          return
        }
      }

      // Redirigir al detalle del alumno
      navigate(`/admin/students/${formData.student_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear rutina')
      setLoading(false)
    }
  }

  const handleAutoSave = useCallback(async (formData: RoutineFormData) => {
    if (!user) return

    if (autoSavedRoutineId) {
      const { error } = await updateRoutine(autoSavedRoutineId, formDataToUpdateRoutineData(formData))
      if (error) throw new Error(error)
      return
    }

    const { data: routine, error } = await createRoutine(formDataToCreateRoutineData(formData), user.id)
    if (error || !routine) throw new Error(error || 'No se pudo crear el borrador')

    setAutoSavedRoutineId(routine.id)
    navigate(`/admin/routines/${routine.id}/edit`, { replace: true })
  }, [autoSavedRoutineId, createRoutine, navigate, updateRoutine, user])

  const handleCancel = () => {
    if (studentId) {
      navigate(`/admin/students/${studentId}`)
    } else {
      navigate('/admin/students')
    }
  }

  const openCopyModal = () => {
    setCopyStudentFilterId(selectedStudentId || '')
    setSelectedRoutineId('')
    setCopyModalOpen(true)
  }

  const closeCopyModal = () => {
    setCopyModalOpen(false)
    setSelectedRoutineId('')
    setCopyStudentFilterId('')
  }

  const handleCopyRoutine = async () => {
    if (!selectedRoutineId) return

    if (formHasData(currentFormData, studentId)) {
      const shouldReplace = window.confirm('¿Querés reemplazar los datos actuales con la rutina seleccionada?')
      if (!shouldReplace) return
    }

    setCopying(true)
    setError(null)

    const { data, error } = await getRoutineWithDetails(selectedRoutineId)
    if (error || !data) {
      setError(error || 'No se pudo cargar la rutina seleccionada')
      setCopying(false)
      return
    }

    const copiedFormData = routineToFormData(data)
    setInitialFormData(copiedFormData)
    setCurrentFormData(copiedFormData)
    setFormKey(prev => prev + 1)
    setCopying(false)
    closeCopyModal()
  }

  const handleContinueDraft = async () => {
    if (!existingDraft) return

    setError(null)
    const { data, error } = await getRoutineWithDetails(existingDraft.id)
    if (error || !data) {
      setError(error || 'No se pudo cargar el borrador')
      return
    }

    const draftFormData = dbRoutineToFormData(data)
    setAutoSavedRoutineId(existingDraft.id)
    setInitialFormData(draftFormData)
    setCurrentFormData(draftFormData)
    setFormKey(prev => prev + 1)
  }

  const copyStudentOptions = useMemo(() => {
    const studentsById = new Map<string, { label: string; count: number }>()

    routines.forEach(routine => {
      const studentName = getRoutineStudentName(routine)
      const current = studentsById.get(routine.student_id)
      studentsById.set(routine.student_id, {
        label: studentName,
        count: (current?.count || 0) + 1,
      })
    })

    return Array.from(studentsById.entries())
      .sort(([, a], [, b]) => a.label.localeCompare(b.label))
      .map(([studentId, student]) => ({
        value: studentId,
        label: `${student.label} (${student.count})`,
      }))
  }, [routines])

  const filteredCopyRoutines = useMemo(
    () => copyStudentFilterId
      ? routines.filter(routine => routine.student_id === copyStudentFilterId)
      : routines,
    [copyStudentFilterId, routines]
  )

  const routineOptions = filteredCopyRoutines.map(routine => {
    const studentName = getRoutineStudentName(routine)
    const dayCount = routine.routine_days?.length || 0
    return {
      value: routine.id,
      label: `${routine.name} · ${studentName} · ${getStatusLabel(routine.status)} · ${routine.total_weeks} sem · ${dayCount} ${dayCount === 1 ? 'día' : 'días'}`,
    }
  })

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/admin/students" className="hover:text-gray-700">Alumnos</Link>
            <span>/</span>
            <span>Nueva rutina</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva rutina</h1>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-900">Copiar rutina existente</h2>
            <p className="text-sm text-gray-500">
              Usá una rutina anterior como punto de partida y editá la copia libremente.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={openCopyModal}
            disabled={routinesLoading || routines.length === 0}
          >
            Empezar desde una rutina existente
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {existingDraft && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-800">
              Tenés un borrador sin terminar para este alumno. ¿Querés continuarlo o empezar desde cero?
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={handleContinueDraft}>
                Continuar borrador
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setDismissedDraftId(existingDraft.id)}>
                Empezar desde cero
              </Button>
            </div>
          </div>
        )}

        <RoutineForm
          key={formKey}
          initialData={initialFormData}
          studentId={initialFormData ? undefined : studentId}
          onSubmit={handleSubmit}
          onAutoSave={handleAutoSave}
          onCancel={handleCancel}
          onChange={setCurrentFormData}
          loading={loading}
        />
      </div>

      <Modal
        isOpen={copyModalOpen}
        onClose={() => {
          closeCopyModal()
        }}
        title="Copiar rutina existente"
        size="lg"
      >
        <div className="space-y-4">
          {routines.length === 0 ? (
            <p className="text-sm text-gray-500">Todavía no hay rutinas disponibles para copiar.</p>
          ) : (
            <>
              <Select
                label="Filtrar por alumno"
                value={copyStudentFilterId}
                onChange={(e) => {
                  setCopyStudentFilterId(e.target.value)
                  setSelectedRoutineId('')
                }}
                options={copyStudentOptions}
                placeholder="Todos los alumnos"
                disabled={routinesLoading || copying}
              />

              {filteredCopyRoutines.length === 0 ? (
                <p className="text-sm text-gray-500">No hay rutinas para el alumno seleccionado.</p>
              ) : (
                <Select
                  label="Rutina"
                  value={selectedRoutineId}
                  onChange={(e) => setSelectedRoutineId(e.target.value)}
                  options={routineOptions}
                  placeholder="Seleccionar rutina"
                  disabled={routinesLoading || copying}
                />
              )}
            </>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                closeCopyModal()
              }}
              disabled={copying}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCopyRoutine}
              disabled={!selectedRoutineId || copying}
            >
              {copying ? 'Copiando...' : 'Usar como base'}
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}

function routineToFormData(routine: RoutineWithDays): RoutineFormData {
  return {
    student_id: '',
    name: '',
    total_weeks: routine.total_weeks,
    days: routine.routine_days.map(day => ({
      id: generateFormId(),
      day_number: day.day_number,
      name: day.name || '',
      blocks: day.routine_blocks.map(block => ({
        id: generateFormId(),
        block_letter: block.block_letter,
        block_order: block.block_order,
        exercises: block.block_exercises.map(exercise => ({
          id: generateFormId(),
          exercise_id: exercise.exercise_id,
          exercise: exercise.exercise,
          position: exercise.position,
          note: exercise.note || '',
          weeks: Array.from({ length: routine.total_weeks }, (_, index) => {
            const weekNumber = index + 1
            const weekSets = exercise.prescribed_sets.filter(set => set.week_number === weekNumber)

            return {
              week_number: weekNumber,
              sets: weekSets.length > 0
                ? weekSets.map(set => formSetFromPrescribedSet(set))
                : [createDefaultFormSet()],
            }
          }),
        })),
      })),
    })),
  }
}

function dbRoutineToFormData(routine: RoutineWithDays): RoutineFormData {
  return {
    student_id: routine.student_id,
    name: routine.name,
    total_weeks: routine.total_weeks,
    days: routine.routine_days.map(day => ({
      id: day.id,
      day_number: day.day_number,
      name: day.name || '',
      blocks: day.routine_blocks.map(block => ({
        id: block.id,
        block_letter: block.block_letter,
        block_order: block.block_order,
        exercises: block.block_exercises.map(exercise => ({
          id: exercise.id,
          exercise_id: exercise.exercise_id,
          exercise: exercise.exercise,
          position: exercise.position,
          note: exercise.note || '',
          weeks: Array.from({ length: routine.total_weeks }, (_, index) => {
            const weekNumber = index + 1
            const weekSets = exercise.prescribed_sets.filter(set => set.week_number === weekNumber)

            return {
              week_number: weekNumber,
              sets: weekSets.length > 0
                ? weekSets.map(set => ({
                    id: set.id,
                    set_type: set.set_type,
                    quantity: set.quantity,
                    weight_kg: set.weight_kg?.toString() || '',
                  }))
                : [createDefaultFormSet()],
            }
          }),
        })),
      })),
    })),
  }
}

function formDataToCreateRoutineData(formData: RoutineFormData): CreateRoutineData {
  return {
    student_id: formData.student_id,
    name: formData.name,
    total_weeks: formData.total_weeks,
    days: formData.days.map(day => ({
      day_number: day.day_number,
      name: day.name || undefined,
      blocks: day.blocks.map(block => ({
        block_letter: block.block_letter,
        block_order: block.block_order,
        exercises: block.exercises.map(exercise => ({
          exercise_id: exercise.exercise_id,
          position: exercise.position,
          note: exercise.note || undefined,
          sets: exercise.weeks.flatMap(week =>
            week.sets.map((set, setIndex) => ({
              week_number: week.week_number,
              set_number: setIndex + 1,
              set_type: set.set_type,
              quantity: set.quantity,
              weight_kg: set.weight_kg ? parseFloat(set.weight_kg) : undefined,
            }))
          ),
        })),
      })),
    })),
  }
}

function formDataToUpdateRoutineData(formData: RoutineFormData): UpdateRoutineData {
  return {
    name: formData.name,
    total_weeks: formData.total_weeks,
    days: formData.days.map(day => ({
      id: day.id,
      day_number: day.day_number,
      name: day.name || undefined,
      blocks: day.blocks.map(block => ({
        id: block.id,
        block_letter: block.block_letter,
        block_order: block.block_order,
        exercises: block.exercises.map(exercise => ({
          id: exercise.id,
          exercise_id: exercise.exercise_id,
          position: exercise.position,
          note: exercise.note || undefined,
          sets: exercise.weeks.flatMap(week =>
            week.sets.map((set, setIndex) => ({
              id: set.id,
              week_number: week.week_number,
              set_number: setIndex + 1,
              set_type: set.set_type,
              quantity: set.quantity,
              weight_kg: set.weight_kg ? parseFloat(set.weight_kg) : undefined,
            }))
          ),
        })),
      })),
    })),
  }
}

function formHasData(formData: RoutineFormData | null, initialStudentId?: string) {
  if (!formData) return false
  if (formData.name.trim()) return true
  if (formData.student_id && formData.student_id !== initialStudentId) return true
  if (formData.total_weeks !== 4) return true
  if (formData.days.length > 1) return true

  return formData.days.some(day => {
    if (day.name.trim()) return true
    if (day.blocks.length > 1) return true

    return day.blocks.some(block => block.exercises.length > 0)
  })
}

function formSetFromPrescribedSet(set: PrescribedSet) {
  return {
    id: generateFormId(),
    set_type: set.set_type,
    quantity: set.quantity,
    weight_kg: set.weight_kg?.toString() || '',
  }
}

function createDefaultFormSet() {
  return {
    id: generateFormId(),
    set_type: 'reps' as const,
    quantity: 8,
    weight_kg: '',
  }
}

function generateFormId() {
  return Math.random().toString(36).substring(2, 11)
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'active':
      return 'Activa'
    case 'archived':
      return 'Archivada'
    case 'draft':
      return 'Borrador'
    default:
      return status
  }
}

function getRoutineStudentName(routine: RoutineWithStudent) {
  return routine.student?.full_name || routine.student?.name || routine.student?.email || 'Alumno'
}
