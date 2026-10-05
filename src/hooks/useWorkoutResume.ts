import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { clearOpenWorkout, readOpenWorkout, writeOpenWorkout } from '../lib/workoutResume'

export function useWorkoutResume(
  userId: string | undefined,
  routineId: string | undefined,
  sequenceAnchorLogId: string | null,
  ready: boolean,
) {
  const location = useLocation()
  const navigate = useNavigate()
  const path = location.pathname + location.search

  useEffect(() => {
    if (!userId || !routineId || !ready) return
    const previous = readOpenWorkout(userId)
    if (previous?.path === path && (previous.routineId !== routineId
      || previous.sequenceAnchorLogId !== sequenceAnchorLogId)) {
      clearOpenWorkout(userId)
      navigate('/', { replace: true })
      return
    }

    const scrollY = previous?.path === path ? previous.scrollY : 0
    writeOpenWorkout(userId, { path, routineId, sequenceAnchorLogId, scrollY })
    let restored = false
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, behavior: 'instant' })
      restored = true
    })

    const savePosition = () => {
      // No recrear una referencia borrada al completar/cancelar o navegar.
      if (!restored || readOpenWorkout(userId)?.path !== path) return
      writeOpenWorkout(userId, { path, routineId, sequenceAnchorLogId, scrollY: window.scrollY })
    }
    window.addEventListener('scroll', savePosition, { passive: true })
    window.addEventListener('pagehide', savePosition)
    document.addEventListener('visibilitychange', savePosition)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', savePosition)
      window.removeEventListener('pagehide', savePosition)
      document.removeEventListener('visibilitychange', savePosition)
    }
  }, [userId, routineId, sequenceAnchorLogId, ready, path, navigate])
}
