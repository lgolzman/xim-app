export type UserRole = 'admin' | 'consulta'
export type ChainType = 'abierta' | 'cerrada'

export interface Profile {
  id: string
  email: string
  role: UserRole
  created_at: string
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
