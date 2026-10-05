import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { clearOpenWorkout, isWorkoutPath, readOpenWorkout } from '../../lib/workoutResume'

// Restaurar sólo al arrancar en inicio, nunca al navegar voluntariamente a inicio.
export function WorkoutResume({ children }: { children: ReactNode }) {
  const { user, profile, loading, isDisabled } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [initializedFor, setInitializedFor] = useState<string | null>(null)
  const previousPath = useRef(location.pathname + location.search)

  useEffect(() => {
    if (loading || !user || !profile || isDisabled) return
    const path = location.pathname + location.search
    if (initializedFor !== user.id) {
      // Sincronizar el arranque autenticado con la ruta persistida antes de montar Home.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInitializedFor(user.id)
      previousPath.current = path
      const workout = readOpenWorkout(user.id)
      if (location.pathname === '/' && workout) {
        navigate(workout.path, { replace: true })
      }
      return
    }
    if (isWorkoutPath(previousPath.current) && !isWorkoutPath(path)) {
      clearOpenWorkout(user.id)
    }
    previousPath.current = path
  }, [loading, user, profile, isDisabled, initializedFor, location.pathname, location.search, navigate])

  // Esperar la decisión de restauración antes de montar Home (también para admins).
  if (!loading && user && profile && !isDisabled && initializedFor !== user.id) return null
  return <>{children}</>
}
