import { Link } from 'react-router-dom'
import { useWorkoutLogs } from '../../hooks/useWorkoutLogs'
import { useActiveRoutine } from '../../hooks/useActiveRoutine'
import type { WorkoutLogWithDetails } from '../../lib/types'

interface StudentProgressProps {
  studentId: string
}

export function StudentProgress({ studentId }: StudentProgressProps) {
  const { routine, loading: routineLoading } = useActiveRoutine(studentId)
  const { logs, loading: logsLoading, countLogsByWeek } = useWorkoutLogs(studentId, routine?.id)

  const loading = routineLoading || logsLoading

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
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
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!routine) {
    return (
      <p className="text-gray-500 text-center py-8">
        Este alumno no tiene una rutina activa.
      </p>
    )
  }

  // Calcular estadísticas por semana
  const weekStats = Array.from({ length: routine.total_weeks }, (_, i) => {
    const weekNumber = i + 1
    const count = countLogsByWeek(weekNumber)
    return { weekNumber, count, totalDays: routine.routine_days.length }
  })

  // Agrupar logs por semana para mostrar
  const logsByWeek = new Map<number, WorkoutLogWithDetails[]>()
  logs.forEach(log => {
    if (!logsByWeek.has(log.week_number)) {
      logsByWeek.set(log.week_number, [])
    }
    logsByWeek.get(log.week_number)!.push(log)
  })

  return (
    <div className="space-y-6">
      {/* Resumen por semana */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Progreso por semana</h3>
        <div className="grid grid-cols-4 gap-2">
          {weekStats.map(({ weekNumber, count, totalDays }) => {
            const percentage = (count / totalDays) * 100
            const isComplete = count >= totalDays

            return (
              <div
                key={weekNumber}
                className={`p-3 rounded-lg text-center ${
                  isComplete
                    ? 'bg-green-50 border border-green-200'
                    : count > 0
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <p className="text-xs text-gray-500">Semana {weekNumber}</p>
                <p className={`text-lg font-bold ${
                  isComplete ? 'text-green-700' : count > 0 ? 'text-yellow-700' : 'text-gray-400'
                }`}>
                  {count}/{totalDays}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div
                    className={`h-1.5 rounded-full ${
                      isComplete ? 'bg-green-500' : count > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Historial de entrenamientos */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Historial de entrenamientos ({logs.length})
        </h3>

        {logs.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            El alumno aún no ha registrado entrenamientos.
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map(log => (
              <Link
                key={log.id}
                to={`/admin/students/${studentId}/workouts/${log.id}`}
                className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        Día {log.routine_day.day_number}
                        {log.routine_day.name && ` — ${log.routine_day.name}`}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-200 rounded text-xs text-gray-600">
                        Sem. {log.week_number}
                      </span>
                      {log.is_extra && (
                        <span className="px-2 py-0.5 bg-amber-50 rounded text-xs text-amber-800">
                          Extra
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatDate(log.completed_at)} a las {formatTime(log.completed_at)}
                    </p>
                    {log.student_note && (
                      <p className="text-sm text-blue-600 mt-1 line-clamp-1">
                        📝 {log.student_note}
                      </p>
                    )}
                  </div>
                  <span className="text-gray-400">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
