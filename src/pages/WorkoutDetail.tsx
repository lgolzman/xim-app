import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { useWorkoutLogs } from '../hooks/useWorkoutLogs'
import { useActiveRoutine } from '../hooks/useActiveRoutine'
import type { WorkoutLogWithDetails, RoutineDayWithBlocks, LoggedSet, PrescribedSet } from '../lib/types'

export function WorkoutDetail() {
  const { logId } = useParams<{ logId: string }>()
  const { user } = useAuth()
  const { routine, loading: routineLoading, getDayById } = useActiveRoutine(user?.id, {
    includeInactiveBlockExercises: true,
  })
  const { getLogById } = useWorkoutLogs(user?.id, routine?.id)

  const [log, setLog] = useState<WorkoutLogWithDetails | null>(null)
  const [day, setDay] = useState<RoutineDayWithBlocks | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLog = async () => {
      if (!logId || routineLoading) return

      const { data, error } = await getLogById(logId)
      if (error) {
        setError(error)
        setLoading(false)
        return
      }

      if (data) {
        setLog(data)
        const dayData = getDayById(data.routine_day_id)
        setDay(dayData)
      }
      setLoading(false)
    }

    fetchLog()
  }, [logId, routineLoading, getLogById, getDayById])

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

  // Helper para obtener el logged set de un ejercicio y serie específicos
  const getLoggedSet = (blockExerciseId: string, setNumber: number): LoggedSet | undefined => {
    return log?.logged_sets.find(
      ls => ls.block_exercise_id === blockExerciseId && ls.set_number === setNumber
    )
  }

  const formatPrescribed = (set: PrescribedSet): string => {
    const qty = set.set_type === 'time' ? `${set.quantity}"` : `${set.quantity} reps`
    const weight = set.weight_kg ? ` / ${set.weight_kg}kg` : ''
    return qty + weight
  }

  const formatActual = (loggedSet: LoggedSet | undefined, setType: 'reps' | 'time'): string => {
    if (!loggedSet) return '−'

    const qty = setType === 'time'
      ? (loggedSet.actual_seconds ? `${loggedSet.actual_seconds}"` : '−')
      : (loggedSet.actual_reps ? `${loggedSet.actual_reps} reps` : '−')
    const weight = loggedSet.actual_weight_kg ? ` / ${loggedSet.actual_weight_kg}kg` : ''

    if (qty === '−' && !weight) return '−'
    return qty + weight
  }

  if (loading || routineLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    )
  }

  if (error || !log) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error || 'No se encontró el registro'}</p>
          <Link to="/history">
            <Button variant="secondary">Volver al historial</Button>
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/" className="hover:text-gray-700">Inicio</Link>
            <span>/</span>
            <Link to="/history" className="hover:text-gray-700">Historial</Link>
            <span>/</span>
            <span>Detalle</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Día {log.routine_day.day_number}
            {log.routine_day.name && ` — ${log.routine_day.name}`}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-600">
              {formatDate(log.completed_at)} a las {formatTime(log.completed_at)}
            </p>
            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
              Semana {log.week_number}
            </span>
            {log.registered_by && log.registered_by !== log.student_id && (
              <span className="px-2 py-0.5 bg-blue-50 rounded text-xs text-blue-700">
                Registrado por entrenadora
              </span>
            )}
          </div>
        </div>

        {/* Nota del alumno */}
        {log.student_note && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800 mb-1">Tu nota:</p>
            <p className="text-blue-700">{log.student_note}</p>
          </div>
        )}

        {/* Ejercicios y series */}
        {day ? (
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
                    const weekSets = exercise.prescribed_sets.filter(s => s.week_number === log.week_number)

                    return (
                      <div key={exercise.id} className="p-4">
                        <div className="mb-3">
                          <span className="text-xs text-gray-500 font-medium">
                            {block.block_letter}{exercise.position}
                          </span>
                          <a
                            href={`/exercises/${exercise.exercise_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-gray-900 hover:text-blue-700 hover:underline"
                          >
                            {exercise.exercise?.name}
                          </a>
                          {exercise.note && (
                            <p className="text-sm text-blue-600 mt-1">📝 {exercise.note}</p>
                          )}
                        </div>

                        {/* Tabla de series */}
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="text-gray-500 font-medium">Serie</div>
                          <div className="text-gray-500 font-medium">Prescrito</div>
                          <div className="text-gray-500 font-medium">Registrado</div>

                          {weekSets.map((set, idx) => {
                            const loggedSet = getLoggedSet(exercise.id, set.set_number)
                            const hasData = loggedSet && (loggedSet.actual_reps || loggedSet.actual_weight_kg || loggedSet.actual_seconds)

                            return (
                              <>
                                <div className="text-gray-600">{idx + 1}</div>
                                <div className="text-gray-600">{formatPrescribed(set)}</div>
                                <div className={hasData ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                  {formatActual(loggedSet, set.set_type)}
                                </div>
                              </>
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
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-700 text-sm">
              No se puede mostrar el detalle completo porque la rutina ya no está disponible.
            </p>
          </div>
        )}

        {/* Volver */}
        <div className="pt-4">
          <Link to="/history">
            <Button variant="secondary">Volver al historial</Button>
          </Link>
        </div>
      </div>
    </Layout>
  )
}
