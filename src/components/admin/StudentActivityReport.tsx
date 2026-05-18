import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { supabase } from '../../lib/supabase'
import type { Student } from '../../lib/types'

type PeriodPreset = 'custom' | '7' | '14' | '30' | '60'

interface ActivityRoutineDay {
  day_number: number
  name: string | null
}

interface ActivityLog {
  id: string
  student_id: string
  routine_day_id: string
  week_number: number
  completed_at: string
  student_note: string | null
  routine_day: ActivityRoutineDay | null
  exercise_note_count: number
  change_count: number
}

interface ActivityLogQueryResult extends Omit<ActivityLog, 'routine_day'> {
  routine_day: ActivityRoutineDay | ActivityRoutineDay[] | null
}

interface ActivityExerciseNote {
  id: string
  workout_log_id: string
}

interface ActivityLoggedSet {
  id: string
  workout_log_id: string
  block_exercise_id: string
  set_number: number
  actual_reps: number | null
  actual_weight_kg: number | null
  actual_seconds: number | null
}

interface ActivityPrescribedSet {
  id: string
  block_exercise_id: string
  week_number: number
  set_number: number
  set_type: 'reps' | 'time'
  quantity: number
  weight_kg: number | null
}

interface StudentActivityRow {
  student: Student
  logs: ActivityLog[]
  sessions: number
  commentOrChangeCount: number
  lastLog: ActivityLog | null
}

const PERIOD_OPTIONS = [
  { value: 'custom', label: 'Personalizado' },
  { value: '7', label: 'Últimos 7 días' },
  { value: '14', label: 'Últimos 14 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '60', label: 'Últimos 60 días' },
]

const hasComments = (log: ActivityLog) => {
  return Boolean(log.student_note?.trim()) || log.exercise_note_count > 0
}

const hasCommentsOrChanges = (log: ActivityLog) => {
  return hasComments(log) || log.change_count > 0
}

const getCommentLabel = (log: ActivityLog) => {
  const parts: string[] = []

  if (log.student_note?.trim()) {
    parts.push('nota del día')
  }

  if (log.exercise_note_count === 1) {
    parts.push('1 nota por ejercicio')
  } else if (log.exercise_note_count > 1) {
    parts.push(`${log.exercise_note_count} notas por ejercicio`)
  }

  if (log.change_count === 1) {
    parts.push('1 cambio')
  } else if (log.change_count > 1) {
    parts.push(`${log.change_count} cambios`)
  }

  return parts.join(' · ')
}

const getPrescribedKey = (blockExerciseId: string, weekNumber: number, setNumber: number) => {
  return `${blockExerciseId}-${weekNumber}-${setNumber}`
}

const getWeightValue = (value: number | null) => value ?? 0

const loggedSetChanged = (
  loggedSet: ActivityLoggedSet,
  prescribedSet: ActivityPrescribedSet | undefined
) => {
  if (!prescribedSet) return false

  const actualQuantity = prescribedSet.set_type === 'time'
    ? loggedSet.actual_seconds
    : loggedSet.actual_reps

  if (actualQuantity !== null && actualQuantity !== prescribedSet.quantity) {
    return true
  }

  if (
    loggedSet.actual_weight_kg !== null &&
    getWeightValue(loggedSet.actual_weight_kg) !== getWeightValue(prescribedSet.weight_kg)
  ) {
    return true
  }

  return false
}

const getStudentName = (student: Student) => {
  return student.full_name || student.name || student.email
}

const formatRelativeDate = (dateString: string | null) => {
  if (!dateString) return '—'

  const date = new Date(dateString)
  const today = new Date()
  const diffMs = today.getTime() - date.getTime()
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

  if (diffDays === 0) return 'hoy'
  if (diffDays === 1) return 'hace 1 día'
  return `hace ${diffDays} días`
}

const formatFullDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function StudentActivityReport() {
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('30')
  const [periodDays, setPeriodDays] = useState('30')
  const [onlyWithComments, setOnlyWithComments] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchReport = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data: studentsData, error: studentsError } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'consulta')
          .order('email')

        if (studentsError) throw studentsError
        if (!isMounted) return

        const activeStudents = ((studentsData || []) as Student[])
          .filter(student => student.active !== false)

        setStudents(activeStudents)

        if (activeStudents.length === 0) {
          setLogs([])
          return
        }

        const days = Math.max(1, Number(periodDays) || 1)
        const fromDate = new Date()
        fromDate.setDate(fromDate.getDate() - days)

        const { data: logsData, error: logsError } = await supabase
          .from('workout_logs')
          .select(`
            id,
            student_id,
            routine_day_id,
            week_number,
            completed_at,
            student_note,
            routine_day:routine_days(day_number, name)
          `)
          .in('student_id', activeStudents.map(student => student.id))
          .gte('completed_at', fromDate.toISOString())
          .order('completed_at', { ascending: false })

        if (logsError) throw logsError
        if (!isMounted) return

        const rawLogs = (logsData || []) as unknown as ActivityLogQueryResult[]

        if (rawLogs.length === 0) {
          setLogs([])
          return
        }

        const { data: notesData, error: notesError } = await supabase
          .from('workout_exercise_notes')
          .select('id, workout_log_id')
          .in('workout_log_id', rawLogs.map(log => log.id))

        if (notesError) throw notesError
        if (!isMounted) return

        const { data: loggedSetsData, error: loggedSetsError } = await supabase
          .from('logged_sets')
          .select('id, workout_log_id, block_exercise_id, set_number, actual_reps, actual_weight_kg, actual_seconds')
          .in('workout_log_id', rawLogs.map(log => log.id))

        if (loggedSetsError) throw loggedSetsError
        if (!isMounted) return

        const loggedSets = (loggedSetsData || []) as ActivityLoggedSet[]
        const blockExerciseIds = Array.from(new Set(loggedSets.map(set => set.block_exercise_id)))

        const { data: prescribedSetsData, error: prescribedSetsError } = blockExerciseIds.length > 0
          ? await supabase
              .from('prescribed_sets')
              .select('id, block_exercise_id, week_number, set_number, set_type, quantity, weight_kg')
              .in('block_exercise_id', blockExerciseIds)
          : { data: [], error: null }

        if (prescribedSetsError) throw prescribedSetsError
        if (!isMounted) return

        const noteCountByLogId = new Map<string, number>()
        ;((notesData || []) as ActivityExerciseNote[]).forEach(note => {
          noteCountByLogId.set(note.workout_log_id, (noteCountByLogId.get(note.workout_log_id) || 0) + 1)
        })

        const prescribedSetsByKey = new Map<string, ActivityPrescribedSet>()
        ;((prescribedSetsData || []) as ActivityPrescribedSet[]).forEach(set => {
          prescribedSetsByKey.set(getPrescribedKey(set.block_exercise_id, set.week_number, set.set_number), set)
        })

        const weekNumberByLogId = new Map(rawLogs.map(log => [log.id, log.week_number]))
        const changeCountByLogId = new Map<string, number>()
        loggedSets.forEach(loggedSet => {
          const weekNumber = weekNumberByLogId.get(loggedSet.workout_log_id)
          if (!weekNumber) return

          const prescribedSet = prescribedSetsByKey.get(
            getPrescribedKey(loggedSet.block_exercise_id, weekNumber, loggedSet.set_number)
          )

          if (loggedSetChanged(loggedSet, prescribedSet)) {
            changeCountByLogId.set(
              loggedSet.workout_log_id,
              (changeCountByLogId.get(loggedSet.workout_log_id) || 0) + 1
            )
          }
        })

        const normalizedLogs = rawLogs
          .map(log => ({
            ...log,
            routine_day: Array.isArray(log.routine_day)
              ? log.routine_day[0] || null
              : log.routine_day,
            exercise_note_count: noteCountByLogId.get(log.id) || 0,
            change_count: changeCountByLogId.get(log.id) || 0,
          }))

        setLogs(normalizedLogs)
      } catch (err) {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Error al cargar reporte')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchReport()

    return () => {
      isMounted = false
    }
  }, [periodDays])

  const rows = useMemo<StudentActivityRow[]>(() => {
    const logsByStudent = new Map<string, ActivityLog[]>()

    logs.forEach(log => {
      if (!logsByStudent.has(log.student_id)) {
        logsByStudent.set(log.student_id, [])
      }
      logsByStudent.get(log.student_id)!.push(log)
    })

    return students
      .map(student => {
        const studentLogs = logsByStudent.get(student.id) || []
        const visibleLogs = onlyWithComments
          ? studentLogs.filter(hasCommentsOrChanges)
          : studentLogs

        return {
          student,
          logs: visibleLogs,
          sessions: studentLogs.length,
          commentOrChangeCount: studentLogs.filter(hasCommentsOrChanges).length,
          lastLog: studentLogs[0] || null,
        }
      })
      .filter(row => !onlyWithComments || row.commentOrChangeCount > 0)
      .sort((a, b) => {
        if (!a.lastLog && !b.lastLog) {
          return getStudentName(a.student).localeCompare(getStudentName(b.student))
        }
        if (!a.lastLog) return 1
        if (!b.lastLog) return -1
        return new Date(b.lastLog.completed_at).getTime() - new Date(a.lastLog.completed_at).getTime()
      })
  }, [students, logs, onlyWithComments])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid w-full gap-3 sm:max-w-md sm:grid-cols-[1fr_8rem]">
          <Select
            label="Período"
            value={periodPreset}
            onChange={(e) => {
              const value = e.target.value as PeriodPreset
              setPeriodPreset(value)
              if (value !== 'custom') {
                setPeriodDays(value)
              }
            }}
            options={PERIOD_OPTIONS}
          />
          <Input
            label="Días"
            type="number"
            min={1}
            value={periodDays}
            onChange={(e) => {
              setPeriodPreset('custom')
              setPeriodDays(e.target.value)
            }}
            onBlur={() => {
              if (!periodDays || Number(periodDays) < 1) {
                setPeriodDays('1')
              }
            }}
          />
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={onlyWithComments}
            onChange={(e) => {
              setOnlyWithComments(e.target.checked)
              setExpandedStudentId(null)
            }}
            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
          />
          Solo entrenamientos con comentarios o cambios
        </label>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Alumno</th>
              <th className="px-4 py-3 font-medium">Sesiones</th>
              <th className="px-4 py-3 font-medium">Último entrenamiento</th>
              <th className="px-4 py-3 font-medium">Comentarios/cambios</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No hay resultados para los filtros seleccionados.
                </td>
              </tr>
            ) : rows.map(row => {
              const isExpanded = expandedStudentId === row.student.id
              const hasActivity = row.sessions > 0

              return (
                <Fragment key={row.student.id}>
                  <tr
                    className={`cursor-pointer hover:bg-gray-50 ${
                      hasActivity ? 'bg-white' : 'bg-gray-50'
                    }`}
                    onClick={() => setExpandedStudentId(isExpanded ? null : row.student.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{getStudentName(row.student)}</span>
                        {!hasActivity && (
                          <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                            Sin actividad
                          </span>
                        )}
                      </div>
                      {(row.student.full_name || row.student.name) && (
                        <p className="text-xs text-gray-500">{row.student.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.sessions}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatRelativeDate(row.lastLog?.completed_at || null)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {row.sessions > 0 ? row.commentOrChangeCount : '—'}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={4} className="bg-gray-50 px-4 py-4">
                        {row.logs.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            No hay entrenamientos para mostrar en este período.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {row.logs.map(log => {
                              const commentLabel = getCommentLabel(log)

                              return (
                                <Link
                                  key={log.id}
                                  to={`/admin/students/${row.student.id}/workouts/${log.id}`}
                                  state={{ fromReport: true }}
                                  className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-3 py-2 hover:border-gray-400"
                                >
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {formatFullDate(log.completed_at)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Día {log.routine_day?.day_number || '—'}
                                      {log.routine_day?.name && ` — ${log.routine_day.name}`}
                                      {' · '}Semana {log.week_number}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {commentLabel && (
                                      <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                                        {commentLabel}
                                      </span>
                                    )}
                                    <span className="text-gray-400">→</span>
                                  </div>
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
