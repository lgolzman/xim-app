import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { useRoutines } from '../../hooks/useRoutines'
import type { WorkoutExerciseNote, WorkoutLogWithDetails, RoutineDayWithBlocks, LoggedSet, PrescribedSet, Student } from '../../lib/types'

export function AdminWorkoutDetail() {
  const { studentId, logId } = useParams<{ studentId: string; logId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { getRoutineWithDetails } = useRoutines()
  const cameFromReport = Boolean((location.state as { fromReport?: boolean } | null)?.fromReport)

  const [log, setLog] = useState<WorkoutLogWithDetails | null>(null)
  const [day, setDay] = useState<RoutineDayWithBlocks | null>(null)
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      if (!logId || !studentId) return
      setLoading(true)
      setError(null)

      const { data: studentData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentId)
        .single()

      if (!isMounted) return

      if (studentData) {
        setStudent(studentData as Student)
      }

      const { data, error } = await supabase
        .from('workout_logs')
        .select(`
          *,
          routine_day:routine_days(*),
          logged_sets(*)
        `)
        .eq('id', logId)
        .eq('student_id', studentId)
        .maybeSingle()

      if (!isMounted) return

      if (error) {
        setError(error.message || 'Error al cargar registro')
        setLoading(false)
        return
      }

      if (!data) {
        setError('No se encontró el registro')
        setLoading(false)
        return
      }

      const { data: exerciseNotesData, error: exerciseNotesError } = await supabase
        .from('workout_exercise_notes')
        .select('*')
        .eq('workout_log_id', data.id)

      if (!isMounted) return

      if (exerciseNotesError) {
        setError(exerciseNotesError.message || 'Error al cargar comentarios')
        setLoading(false)
        return
      }

      const workoutLog = data as WorkoutLogWithDetails
      workoutLog.workout_exercise_notes = (exerciseNotesData || []) as WorkoutExerciseNote[]

      if (workoutLog.logged_sets) {
        workoutLog.logged_sets.sort((a: LoggedSet, b: LoggedSet) =>
          a.block_exercise_id.localeCompare(b.block_exercise_id) || a.set_number - b.set_number
        )
      }

      setLog(workoutLog)

      const { data: routineData, error: routineError } = await getRoutineWithDetails(
        workoutLog.routine_id,
        { includeInactiveBlockExercises: true }
      )

      if (!isMounted) return

      if (routineError) {
        setError(routineError)
        setLoading(false)
        return
      }

      const dayData = routineData?.routine_days.find(routineDay => routineDay.id === workoutLog.routine_day_id) || null
      setDay(dayData)
      setLoading(false)
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [logId, studentId, getRoutineWithDetails])

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

  const getLoggedSet = (blockExerciseId: string, setNumber: number): LoggedSet | undefined => {
    return log?.logged_sets.find(
      ls => ls.block_exercise_id === blockExerciseId && ls.set_number === setNumber
    )
  }

  const getExerciseNote = (blockExerciseId: string): WorkoutExerciseNote | undefined => {
    return log?.workout_exercise_notes?.find(note => note.block_exercise_id === blockExerciseId)
  }

  const exerciseNameByBlockExerciseId = new Map<string, string>()
  day?.routine_blocks.forEach(block => {
    block.block_exercises.forEach(exercise => {
      exerciseNameByBlockExerciseId.set(
        exercise.id,
        `${block.block_letter}${exercise.position} · ${exercise.exercise?.name || 'Ejercicio'}`
      )
    })
  })

  const exerciseNotes = log?.workout_exercise_notes || []

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

  if (loading) {
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
          <Link to={`/admin/students/${studentId}`}>
            <Button variant="secondary">Volver al alumno</Button>
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
            <Link to="/admin/students" className="hover:text-gray-700">Alumnos</Link>
            <span>/</span>
            <Link to={`/admin/students/${studentId}`} className="hover:text-gray-700">
              {student?.full_name || student?.name || student?.email || 'Alumno'}
            </Link>
            <span>/</span>
            <span>Entrenamiento</span>
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
          </div>
        </div>

        {/* Nota del alumno */}
        {log.student_note && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800 mb-1">Nota del alumno:</p>
            <p className="text-blue-700">{log.student_note}</p>
          </div>
        )}

        {exerciseNotes.length > 0 && (
          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-blue-900 mb-3">Comentarios por ejercicio</h2>
            <div className="space-y-2">
              {exerciseNotes.map(note => (
                <div key={note.id} className="rounded-lg bg-blue-50 px-3 py-2">
                  <p className="text-xs font-medium text-blue-800">
                    {exerciseNameByBlockExerciseId.get(note.block_exercise_id) || 'Ejercicio'}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">{note.note}</p>
                </div>
              ))}
            </div>
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
                    const exerciseNote = getExerciseNote(exercise.id)

                    return (
                      <div key={exercise.id} className="p-4">
                        <div className="mb-3">
                          <span className="mr-2 text-xs text-gray-500 font-medium">
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
                            <p className="text-sm text-gray-500 mt-1">📝 {exercise.note}</p>
                          )}
                          {exerciseNote && (
                            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                              <p className="text-xs font-medium text-blue-800 mb-1">Comentario del alumno</p>
                              <p className="text-sm text-blue-700">{exerciseNote.note}</p>
                            </div>
                          )}
                        </div>

                        {/* Tabla de series */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-500">
                                <th className="pb-2 pr-4 font-medium w-16">Serie</th>
                                <th className="pb-2 pr-4 font-medium">Prescrito</th>
                                <th className="pb-2 font-medium">Registrado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {weekSets.map((set, idx) => {
                                const loggedSet = getLoggedSet(exercise.id, set.set_number)
                                const hasData = loggedSet && (loggedSet.actual_reps || loggedSet.actual_weight_kg || loggedSet.actual_seconds)

                                return (
                                  <tr key={set.id} className="border-t border-gray-100">
                                    <td className="py-2 pr-4 text-gray-600">{idx + 1}</td>
                                    <td className="py-2 pr-4 text-gray-600">{formatPrescribed(set)}</td>
                                    <td className={`py-2 ${hasData ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                                      {formatActual(loggedSet, set.set_type)}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
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
        <div className="flex flex-wrap gap-3 pt-4">
          {cameFromReport && (
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Volver al reporte
            </Button>
          )}
          <Link to={`/admin/students/${studentId}`}>
            <Button variant="secondary">Volver al alumno</Button>
          </Link>
        </div>
      </div>
    </Layout>
  )
}
