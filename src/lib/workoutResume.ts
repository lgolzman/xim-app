export interface OpenWorkout {
  path: string
  routineId: string
  sequenceAnchorLogId: string | null
  scrollY: number
}

const keyFor = (userId: string) => `xim_open_workout_v1_${userId}`

export function isWorkoutPath(path: string): boolean {
  return /^\/workout\/[^/?#]+(?:\?[^#]*)?$/.test(path)
    || /^\/admin\/students\/[^/?#]+\/register-workout\?[^#]+$/.test(path)
}

export function readOpenWorkout(userId: string): OpenWorkout | null {
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(userId)) || 'null')
    if (!value || typeof value.path !== 'string' || !isWorkoutPath(value.path)
      || typeof value.routineId !== 'string'
      || !(value.sequenceAnchorLogId === null || typeof value.sequenceAnchorLogId === 'string')
      || typeof value.scrollY !== 'number' || !Number.isFinite(value.scrollY) || value.scrollY < 0) {
      return null
    }
    return value as OpenWorkout
  } catch {
    return null
  }
}

export function writeOpenWorkout(userId: string, workout: OpenWorkout) {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(workout))
  } catch {
    // La navegación sigue funcionando cuando el almacenamiento no está disponible.
  }
}

export function clearOpenWorkout(userId: string) {
  try {
    localStorage.removeItem(keyFor(userId))
  } catch {
    // No bloquear la salida si el navegador impide acceder al almacenamiento.
  }
}
