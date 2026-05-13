import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { useNextWorkout } from '../hooks/useNextWorkout'
import type { RoutineDayWithBlocks, PrescribedSet, LoggedSet } from '../lib/types'

export function StudentHome() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { info, loading, routine, getAvailableDays } = useNextWorkout(user?.id)

  const [showDaySelector, setShowDaySelector] = useState(false)

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  const handleStartWorkout = (dayId: string) => {
    if (info) {
      navigate(`/workout/${dayId}?week=${info.currentWeek}`)
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

  if (!info?.hasActiveRoutine) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">-</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sin rutina activa</h1>
          <p className="text-gray-600 mb-6">
            Tu entrenadora aún no te asignó una rutina de entrenamiento.
          </p>
          <Link to="/exercises">
            <Button variant="secondary">Ver biblioteca de ejercicios</Button>
          </Link>
        </div>
      </Layout>
    )
  }

  const availableDays = getAvailableDays()

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header con info de rutina */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{info.routineName}</h1>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
              Semana {info.currentWeek} de {info.totalWeeks}
            </span>
          </div>

          {/* Último entrenamiento */}
          {info.lastLog && info.lastLogDate ? (
            <p className="text-gray-600">
              Tu último entrenamiento fue el {formatDate(info.lastLogDate)} — hiciste el Día {info.lastLogDayNumber}.
            </p>
          ) : (
            <p className="text-gray-600">
              Todavía no registraste ningún entrenamiento de esta rutina.
            </p>
          )}
        </div>

        {/* Día sugerido */}
        {info.suggestedDay && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-900 text-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Hoy te toca:</p>
                  <h2 className="text-xl font-bold">
                    Día {info.suggestedDayNumber}
                    {info.suggestedDay.name && ` — ${info.suggestedDay.name}`}
                  </h2>
                </div>
                <Button
                  onClick={() => handleStartWorkout(info.suggestedDay!.id)}
                  className="bg-white text-gray-900 hover:bg-gray-100"
                >
                  Empezar entrenamiento
                </Button>
              </div>
            </div>

            {/* Vista comparativa */}
            <div className="p-6">
              {info.lastLogForSuggestedDay ? (
                <ComparisonView
                  day={info.suggestedDay}
                  currentWeek={info.currentWeek}
                  lastLog={info.lastLogForSuggestedDay}
                  routine={routine}
                />
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Primera vez que entrenas este día. ¡Buena suerte!
                </p>
              )}
            </div>
          </div>
        )}

        {/* Selector de otro día */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <button
            onClick={() => setShowDaySelector(!showDaySelector)}
            className="w-full flex items-center justify-between text-gray-600 hover:text-gray-900"
          >
            <span className="text-sm font-medium">Entrenar otro día</span>
            <span className="text-xl">{showDaySelector ? '−' : '+'}</span>
          </button>

          {showDaySelector && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {availableDays.map(day => (
                <button
                  key={day.id}
                  onClick={() => handleStartWorkout(day.id)}
                  disabled={info.suggestedDay?.id === day.id}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    info.suggestedDay?.id === day.id
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white border-gray-200 hover:border-gray-400 text-gray-700'
                  }`}
                >
                  Día {day.day_number}
                  {day.name && <span className="block text-xs text-gray-500 mt-1">{day.name}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Link al historial */}
        <div className="text-center">
          <Link to="/history" className="text-sm text-gray-500 hover:text-gray-700 underline">
            Ver historial de entrenamientos
          </Link>
        </div>
      </div>
    </Layout>
  )
}

// Componente de vista comparativa
interface ComparisonViewProps {
  day: RoutineDayWithBlocks
  currentWeek: number
  lastLog: {
    week_number: number
    completed_at: string
    logged_sets: LoggedSet[]
  }
  routine: any
}

function ComparisonView({ day, currentWeek, lastLog }: ComparisonViewProps) {
  const lastLogDate = new Date(lastLog.completed_at)

  // Crear mapa de logged sets por block_exercise_id y set_number
  const loggedSetsMap = new Map<string, LoggedSet>()
  lastLog.logged_sets.forEach(ls => {
    const key = `${ls.block_exercise_id}-${ls.set_number}`
    loggedSetsMap.set(key, ls)
  })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 text-center text-sm border-b border-gray-200 pb-3">
        <div>
          <p className="text-gray-500">Última vez</p>
          <p className="font-medium text-gray-900">
            {lastLogDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} — Semana {lastLog.week_number}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Hoy</p>
          <p className="font-medium text-gray-900">Semana {currentWeek}</p>
        </div>
      </div>

      {day.routine_blocks.map(block => (
        <div key={block.id} className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Bloque {block.block_letter}
            {block.block_exercises.length > 1 && (
              <span className="text-xs font-normal text-gray-400 ml-2">(superset)</span>
            )}
          </h4>

          {block.block_exercises.map(exercise => {
            const prescribedSetsLastWeek = exercise.prescribed_sets.filter(s => s.week_number === lastLog.week_number)
            const prescribedSetsThisWeek = exercise.prescribed_sets.filter(s => s.week_number === currentWeek)

            return (
              <div key={exercise.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs text-gray-500 font-medium">
                      {block.block_letter}{exercise.position}
                    </span>
                    <h5 className="font-medium text-gray-900">{exercise.exercise?.name}</h5>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {/* Columna izquierda: lo que hizo la última vez */}
                  <div className="space-y-1">
                    {prescribedSetsLastWeek.map((set, idx) => {
                      const loggedSet = loggedSetsMap.get(`${exercise.id}-${set.set_number}`)
                      return (
                        <div key={set.id} className="flex items-center gap-2">
                          <span className="text-gray-400 w-4">{idx + 1}.</span>
                          {loggedSet ? (
                            <span className="text-gray-700">
                              {set.set_type === 'time'
                                ? `${loggedSet.actual_seconds || '−'}"`
                                : `${loggedSet.actual_reps || '−'} reps`}
                              {loggedSet.actual_weight_kg && ` / ${loggedSet.actual_weight_kg}kg`}
                            </span>
                          ) : (
                            <span className="text-gray-400">
                              {formatPrescribedSet(set)}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Columna derecha: lo prescrito para hoy */}
                  <div className="space-y-1">
                    {prescribedSetsThisWeek.map((set, idx) => (
                      <div key={set.id} className="flex items-center gap-2">
                        <span className="text-gray-400 w-4">{idx + 1}.</span>
                        <span className="text-gray-900 font-medium">
                          {formatPrescribedSet(set)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function formatPrescribedSet(set: PrescribedSet): string {
  const qty = set.set_type === 'time' ? `${set.quantity}"` : `${set.quantity} reps`
  const weight = set.weight_kg ? ` / ${set.weight_kg}kg` : ''
  return qty + weight
}
