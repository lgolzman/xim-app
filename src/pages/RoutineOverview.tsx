import { Link } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { RoutineOverviewTable } from '../components/routines/RoutineOverviewTable'
import { useAuth } from '../context/AuthContext'
import { useActiveRoutine } from '../hooks/useActiveRoutine'

export function RoutineOverview() {
  const { user } = useAuth()
  const { routine, loading, error } = useActiveRoutine(user?.id)

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
          <p className="text-red-600 mb-4">{error || 'No tenés una rutina activa.'}</p>
          <Link to="/">
            <Button variant="secondary">Volver</Button>
          </Link>
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
              <Link to="/" className="hover:text-gray-700">Entrenar</Link>
              <span>/</span>
              <span>Mi rutina</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{routine.name}</h1>
            <p className="text-sm text-gray-500">{routine.total_weeks} semanas</p>
          </div>
          <Link to="/">
            <Button variant="secondary">Volver</Button>
          </Link>
        </div>

        <RoutineOverviewTable routine={routine} />
      </div>
    </Layout>
  )
}
