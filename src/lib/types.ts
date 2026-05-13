export type UserRole = 'admin' | 'consulta'
export type ChainType = 'abierta' | 'cerrada'

export interface Profile {
  id: string
  email: string
  name?: string | null
  role: UserRole
  created_at: string
  active?: boolean
  disabled_by?: string | null
  disabled_at?: string | null
}

export interface Invitation {
  id: string
  email: string
  role: UserRole
  token: string
  used: boolean
  created_by: string
  created_at: string
  expires_at: string | null
}

export interface MovementPattern {
  id: string
  name: string
  created_at: string
}

export interface Muscle {
  id: string
  name: string
  created_at: string
}

export interface Direction {
  id: string
  name: string
}

export interface ExerciseVideo {
  id: string
  exercise_id: string
  url: string
  title: string | null
  created_at: string
}

export interface Exercise {
  id: string
  name: string
  movement_pattern_id: string | null
  direction_id: string | null
  chain_type: ChainType | null
  execution_tips: string | null
  created_at: string
  updated_at: string
}

export interface ExerciseWithRelations extends Exercise {
  movement_pattern: MovementPattern | null
  direction: Direction | null
  primary_muscles: Muscle[]
  synergist_muscles: Muscle[]
  videos: ExerciseVideo[]
}

export interface ExerciseFormData {
  name: string
  movement_pattern_id: string
  direction_id: string
  chain_type: ChainType | null
  execution_tips: string
  primary_muscle_ids: string[]
  synergist_muscle_ids: string[]
  videos: { url: string; title: string }[]
}

// =============================================
// TIPOS PARA MÓDULO DE RUTINAS
// =============================================

export type RoutineStatus = 'draft' | 'active' | 'archived'
export type SetType = 'reps' | 'time'

export interface Student extends Profile {
  active: boolean
  disabled_by: string | null
  disabled_at: string | null
}

export interface Routine {
  id: string
  student_id: string
  created_by: string
  name: string
  total_weeks: number
  status: RoutineStatus
  created_at: string
  updated_at: string
}

export interface RoutineDay {
  id: string
  routine_id: string
  day_number: number
  name: string | null
}

export interface RoutineBlock {
  id: string
  routine_day_id: string
  block_letter: string
  block_order: number
}

export interface BlockExercise {
  id: string
  block_id: string
  exercise_id: string
  position: number
  note: string | null
}

export interface PrescribedSet {
  id: string
  block_exercise_id: string
  week_number: number
  set_number: number
  set_type: SetType
  quantity: number
  weight_kg: number | null
}

export interface WorkoutLog {
  id: string
  student_id: string
  routine_id: string
  routine_day_id: string
  week_number: number
  completed_at: string
  student_note: string | null
}

export interface LoggedSet {
  id: string
  workout_log_id: string
  block_exercise_id: string
  set_number: number
  actual_reps: number | null
  actual_weight_kg: number | null
  actual_seconds: number | null
}

// Tipos con relaciones para queries complejas
export interface RoutineWithStudent extends Routine {
  student: Student
}

export interface ExerciseInRoutine extends Exercise {
  videos?: ExerciseVideo[]
}

export interface BlockExerciseWithDetails extends BlockExercise {
  exercise: ExerciseInRoutine
  prescribed_sets: PrescribedSet[]
}

export interface RoutineBlockWithExercises extends RoutineBlock {
  block_exercises: BlockExerciseWithDetails[]
}

export interface RoutineDayWithBlocks extends RoutineDay {
  routine_blocks: RoutineBlockWithExercises[]
}

export interface RoutineWithDays extends Routine {
  routine_days: RoutineDayWithBlocks[]
}

export interface WorkoutLogWithDetails extends WorkoutLog {
  routine_day: RoutineDay
  logged_sets: LoggedSet[]
}
