import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { RoutineOverviewTable } from '../../components/routines/RoutineOverviewTable'
import { useRoutines } from '../../hooks/useRoutines'
import type { RoutineWithDays } from '../../lib/types'

export function RoutineOverviewAdmin() {
  const navigate = useNavigate()
  const { routineId } = useParams<{ routineId: string }>()
  const { getRoutineWithDetails } = useRoutines()

  const [routine, setRoutine] = useState<RoutineWithDays | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadRoutine = async () => {
      if (!routineId) return

      const { data, error } = await getRoutineWithDetails(routineId)
      if (error) {
        setError(error)
      } else {
        setRoutine(data)
      }
      setLoading(false)
    }

    loadRoutine()
  }, [routineId, getRoutineWithDetails])

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    )
  }

  if (error || !routine) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Rutina no encontrada'}</p>
          <Button variant="secondary" onClick={() => navigate('/admin')}>
            Volver
          </Button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link to="/admin" className="hover:text-gray-700">Administración</Link>
              <span>/</span>
              <Link to={`/admin/students/${routine.student_id}`} className="hover:text-gray-700">Alumno</Link>
              <span>/</span>
              <span>Rutina completa</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{routine.name}</h1>
            <p className="text-sm text-gray-500">{routine.total_weeks} semanas</p>
          </div>
          <div className="flex gap-2">
            <Link to={`/admin/routines/${routine.id}/edit`}>
              <Button variant="secondary">Editar</Button>
            </Link>
            <Link to={`/admin/students/${routine.student_id}`}>
              <Button variant="secondary">Volver</Button>
            </Link>
          </div>
        </div>

        <RoutineOverviewTable routine={routine} />
      </div>
    </Layout>
  )
}
