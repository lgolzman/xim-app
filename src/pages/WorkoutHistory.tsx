import { Link } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { useWorkoutLogs } from '../hooks/useWorkoutLogs'
import { useActiveRoutine } from '../hooks/useActiveRoutine'

export function WorkoutHistory() {
  const { user } = useAuth()
  const { routine, loading: routineLoading } = useActiveRoutine(user?.id)
  const { logs, loading: logsLoading } = useWorkoutLogs(user?.id, routine?.id)

  const loading = routineLoading || logsLoading

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    })
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link to="/" className="hover:text-gray-700">Inicio</Link>
              <span>/</span>
              <span>Historial</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Historial de entrenamientos</h1>
            {routine && (
              <p className="text-gray-600">{routine.name}</p>
            )}
          </div>
        </div>

        {/* Lista de entrenamientos */}
        {logs.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-4">Todavía no registraste ningún entrenamiento.</p>
            <Link to="/">
              <Button>Empezar a entrenar</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <Link
                key={log.id}
                to={`/history/${log.id}`}
                className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        Día {log.routine_day.day_number}
                        {log.routine_day.name && ` — ${log.routine_day.name}`}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                        Semana {log.week_number}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(log.completed_at)} a las {formatTime(log.completed_at)}
                    </p>
                    {log.student_note && (
                      <p className="text-sm text-blue-600 mt-2 line-clamp-1">
                        📝 {log.student_note}
                      </p>
                    )}
                  </div>
                  <div className="text-gray-400">
                    →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
