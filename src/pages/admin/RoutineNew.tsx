import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Layout } from '../../components/layout/Layout'
import { RoutineForm } from '../../components/admin/RoutineForm'
import type { RoutineFormData } from '../../components/admin/RoutineForm'
import { useRoutines } from '../../hooks/useRoutines'
import type { CreateRoutineData } from '../../hooks/useRoutines'
import { useAuth } from '../../context/AuthContext'

export function RoutineNew() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const studentId = searchParams.get('studentId') || undefined
  const { user } = useAuth()
  const { createRoutine, updateRoutineStatus } = useRoutines()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (formData: RoutineFormData, action: 'draft' | 'active') => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Convertir FormData a CreateRoutineData
      const routineData: CreateRoutineData = {
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

      const { data: routine, error: createError } = await createRoutine(routineData, user.id)

      if (createError) {
        setError(createError)
        setLoading(false)
        return
      }

      if (routine && action === 'active') {
        const { error: activateError } = await updateRoutineStatus(routine.id, 'active')
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

  const handleCancel = () => {
    if (studentId) {
      navigate(`/admin/students/${studentId}`)
    } else {
      navigate('/admin')
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/admin" className="hover:text-gray-700">Administración</Link>
            <span>/</span>
            <span>Nueva rutina</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva rutina</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <RoutineForm
          studentId={studentId}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
      </div>
    </Layout>
  )
}
