import { useMemo } from 'react'
import { useActiveRoutine } from './useActiveRoutine'
import { useWorkoutLogs } from './useWorkoutLogs'
import type { RoutineDayWithBlocks, WorkoutLogWithDetails } from '../lib/types'

export interface NextWorkoutInfo {
  // Información de contexto
  hasActiveRoutine: boolean
  routineName: string | null
  totalWeeks: number
  totalDays: number

  // Estado actual
  currentWeek: number
  suggestedDay: RoutineDayWithBlocks | null
  suggestedDayNumber: number

  // Último entrenamiento
  lastLog: WorkoutLogWithDetails | null
  lastLogDate: Date | null
  lastLogDayNumber: number | null

  // Comparación: último log del día sugerido
  lastLogForSuggestedDay: WorkoutLogWithDetails | null

  // Flags útiles
  isFirstWorkout: boolean
  isNewWeek: boolean
}

export function useNextWorkout(studentId: string | undefined) {
  const { routine, loading: routineLoading, error: routineError } = useActiveRoutine(studentId)
  const { logs, loading: logsLoading, error: logsError } = useWorkoutLogs(studentId, routine?.id)

  const loading = routineLoading || logsLoading
  const error = routineError || logsError

  // Calcular toda la información del próximo entrenamiento
  const nextWorkoutInfo = useMemo((): NextWorkoutInfo | null => {
    if (!routine) {
      return {
        hasActiveRoutine: false,
        routineName: null,
        totalWeeks: 0,
        totalDays: 0,
        currentWeek: 1,
        suggestedDay: null,
        suggestedDayNumber: 1,
        lastLog: null,
        lastLogDate: null,
        lastLogDayNumber: null,
        lastLogForSuggestedDay: null,
        isFirstWorkout: true,
        isNewWeek: false,
      }
    }

    const totalDays = routine.routine_days.length
    const totalWeeks = routine.total_weeks
    const sortedDays = [...routine.routine_days].sort((a, b) => a.day_number - b.day_number)

    const progressionLogs = logs.filter(log => !log.is_extra)

    // Obtener el último log real (logs ya viene ordenado por completed_at DESC)
    const lastLog = logs.length > 0 ? logs[0] : null
    const lastLogDate = lastLog ? new Date(lastLog.completed_at) : null
    const lastLogDayNumber = lastLog ? lastLog.routine_day.day_number : null
    const lastProgressionLog = progressionLogs.length > 0 ? progressionLogs[0] : null
    const lastProgressionLogDayNumber = lastProgressionLog ? lastProgressionLog.routine_day.day_number : null

    // Si no hay logs de progresion, el proximo sugerido sigue siendo el primer dia.
    if (!lastProgressionLog) {
      const firstDay = sortedDays[0] || null
      return {
        hasActiveRoutine: true,
        routineName: routine.name,
        totalWeeks,
        totalDays,
        currentWeek: 1,
        suggestedDay: firstDay,
        suggestedDayNumber: 1,
        lastLog,
        lastLogDate,
        lastLogDayNumber,
        lastLogForSuggestedDay: null,
        isFirstWorkout: logs.length === 0,
        isNewWeek: false,
      }
    }

    // La semana actual es la del ultimo log que avanzo la secuencia
    let currentWeek = lastProgressionLog.week_number

    // Determinar el siguiente día
    let suggestedDayNumber: number
    let isNewWeek = false

    if (lastProgressionLogDayNumber !== null) {
      if (lastProgressionLogDayNumber >= totalDays) {
        // Completó el último día, pasar a semana siguiente (si hay)
        if (currentWeek < totalWeeks) {
          suggestedDayNumber = 1
          currentWeek = currentWeek + 1
          isNewWeek = true
        } else {
          // Ya terminó todas las semanas, sugerir repetir el último día
          // o día 1 de la última semana (el usuario decide)
          suggestedDayNumber = 1
        }
      } else {
        // Siguiente día de la misma semana
        suggestedDayNumber = lastProgressionLogDayNumber + 1
      }
    } else {
      suggestedDayNumber = 1
    }

    const suggestedDay = sortedDays.find(d => d.day_number === suggestedDayNumber) || sortedDays[0]

    // Buscar el último log para el día sugerido (para comparación)
    const lastLogForSuggestedDay = suggestedDay
      ? logs.find(log => log.routine_day_id === suggestedDay.id) || null
      : null

    return {
      hasActiveRoutine: true,
      routineName: routine.name,
      totalWeeks,
      totalDays,
      currentWeek,
      suggestedDay,
      suggestedDayNumber,
      lastLog,
      lastLogDate,
      lastLogDayNumber,
      lastLogForSuggestedDay,
      isFirstWorkout: false,
      isNewWeek,
    }
  }, [routine, logs])

  const info = loading ? null : nextWorkoutInfo

  // Función helper para obtener el log anterior de cualquier día
  const getLastLogForDayNumber = (dayNumber: number): WorkoutLogWithDetails | null => {
    if (!routine) return null
    const day = routine.routine_days.find(d => d.day_number === dayNumber)
    if (!day) return null
    return logs.find(log => log.routine_day_id === day.id) || null
  }

  // Obtener día de rutina por número
  const getDayByNumber = (dayNumber: number): RoutineDayWithBlocks | null => {
    if (!routine) return null
    return routine.routine_days.find(d => d.day_number === dayNumber) || null
  }

  // Obtener todos los días disponibles para selección manual
  const getAvailableDays = (): RoutineDayWithBlocks[] => {
    if (!routine) return []
    return [...routine.routine_days].sort((a, b) => a.day_number - b.day_number)
  }

  return {
    info,
    loading,
    error,
    routine,
    logs,
    getLastLogForDayNumber,
    getDayByNumber,
    getAvailableDays,
  }
}
