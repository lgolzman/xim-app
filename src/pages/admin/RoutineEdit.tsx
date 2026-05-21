import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Layout } from '../../components/layout/Layout'
import { RoutineForm } from '../../components/admin/RoutineForm'
import type { RoutineFormData } from '../../components/admin/RoutineForm'
import { Button } from '../../components/ui/Button'
import { useRoutines } from '../../hooks/useRoutines'
import { useAuth } from '../../context/AuthContext'
import { useExercises } from '../../hooks/useExercises'
import type { RoutineWithDays } from '../../lib/types'

export function RoutineEdit() {
  const navigate = useNavigate()
  const { routineId } = useParams<{ routineId: string }>()
  const { user } = useAuth()
  const { getRoutineWithDetails, updateRoutine, updateRoutineStatus } = useRoutines()
  const { exercises } = useExercises()

  const [routine, setRoutine] = useState<RoutineWithDays | null>(null)
  const [initialFormData, setInitialFormData] = useState<RoutineFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadRoutine = async () => {
      if (!routineId) return

      const { data, error } = await getRoutineWithDetails(routineId)

      if (error) {
        setError(error)
        setLoading(false)
        return
      }

      if (!data) {
        setError('Rutina no encontrada')
        setLoading(false)
        return
      }

      setRoutine(data)

      // Convertir datos de BD al formato del formulario
      const formData: RoutineFormData = {
        student_id: data.student_id,
        name: data.name,
        total_weeks: data.total_weeks,
        days: (data.routine_days || []).map(day => ({
          id: day.id,
          day_number: day.day_number,
          name: day.name || '',
          blocks: (day.routine_blocks || []).map(block => ({
            id: block.id,
            block_letter: block.block_letter,
            block_order: block.block_order,
            exercises: (block.block_exercises || []).map(ex => {
              // Agrupar sets por semana
              const weekMap = new Map<number, typeof ex.prescribed_sets>()
              ;(ex.prescribed_sets || []).forEach(set => {
                if (!weekMap.has(set.week_number)) {
                  weekMap.set(set.week_number, [])
                }
                weekMap.get(set.week_number)!.push(set)
              })

              // Crear weeks array
              const weeks = Array.from({ length: data.total_weeks }, (_, i) => {
                const weekNumber = i + 1
                const weekSets = weekMap.get(weekNumber) || []
                return {
                  week_number: weekNumber,
                  sets: weekSets.length > 0
                    ? weekSets.map(s => ({
                        id: s.id,
                        set_type: s.set_type,
                        quantity: s.quantity,
                        weight_kg: s.weight_kg?.toString() || '',
                      }))
                    : [{
                        id: Math.random().toString(36).substr(2, 9),
                        set_type: 'reps' as const,
                        quantity: 8,
                        weight_kg: '',
                      }],
                }
              })

              // Encontrar el ejercicio completo para mostrar el nombre
              const exerciseData = exercises.find(e => e.id === ex.exercise_id) || ex.exercise

              return {
                id: ex.id,
                exercise_id: ex.exercise_id,
                exercise: exerciseData,
                position: ex.position,
                note: ex.note || '',
                weeks,
              }
            }),
          })),
        })),
      }

      setInitialFormData(formData)
      setLoading(false)
    }

    loadRoutine()
  }, [routineId, getRoutineWithDetails, exercises])

  const handleSubmit = async (formData: RoutineFormData, action: 'draft' | 'active') => {
    if (!user || !routine || !routineId) return

    setSaving(true)
    setError(null)

    try {
      const { error: updateError } = await updateRoutine(routineId, {
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
      })

      if (updateError) {
        setError(updateError)
        setSaving(false)
        return
      }

      // Si la acción es activar, cambiar estado
      if (action === 'active' && routine.status !== 'active') {
        const { error: activateError } = await updateRoutineStatus(routineId, 'active')
        if (activateError) {
          setError(activateError)
          setSaving(false)
          return
        }
      }

      // Redirigir al detalle del alumno
      navigate(`/admin/students/${formData.student_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar rutina')
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (routine) {
      navigate(`/admin/students/${routine.student_id}`)
    } else {
      navigate('/admin/students')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    )
  }

  if (error || !routine || !initialFormData) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Rutina no encontrada'}</p>
          <Button variant="secondary" onClick={() => navigate('/admin/students')}>
            Volver
          </Button>
        </div>
      </Layout>
    )
  }

  const isArchived = routine.status === 'archived'

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/admin/students" className="hover:text-gray-700">Alumnos</Link>
            <span>/</span>
            <Link to={`/admin/students/${routine.student_id}`} className="hover:text-gray-700">
              Alumno
            </Link>
            <span>/</span>
            <span>{isArchived ? 'Ver rutina' : 'Editar rutina'}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {isArchived ? routine.name : `Editar: ${routine.name}`}
            </h1>
            {routine.status === 'draft' && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                Borrador
              </span>
            )}
            {routine.status === 'active' && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Activa
              </span>
            )}
            {routine.status === 'archived' && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                Archivada
              </span>
            )}
            <Link to={`/admin/routines/${routine.id}/view`}>
              <Button variant="secondary" size="sm">
                Ver rutina completa
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {isArchived ? (
          // Vista de solo lectura para rutinas archivadas
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-gray-500 mb-4">
              Esta rutina está archivada y no puede ser editada.
            </p>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-500">Nombre:</span>
                <p className="font-medium">{routine.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Semanas:</span>
                <p className="font-medium">{routine.total_weeks}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Días:</span>
                <p className="font-medium">{routine.routine_days?.length || 0}</p>
              </div>
            </div>
            <div className="mt-6">
              <Button variant="secondary" onClick={handleCancel}>
                Volver
              </Button>
            </div>
          </div>
        ) : (
          <RoutineForm
            initialData={initialFormData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isEditing={true}
            routineStatus={routine.status}
            loading={saving}
          />
        )}
      </div>
    </Layout>
  )
}
