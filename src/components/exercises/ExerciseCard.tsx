import type { ExerciseWithRelations } from '../../lib/types'

interface ExerciseCardProps {
  exercise: ExerciseWithRelations
  onClick: () => void
}

export function ExerciseCard({ exercise, onClick }: ExerciseCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <h3 className="font-semibold text-gray-900 mb-2">{exercise.name}</h3>

      <div className="flex flex-wrap gap-2 mb-3">
        {exercise.movement_pattern && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
            {exercise.movement_pattern.name}
          </span>
        )}
        {exercise.direction && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
            {exercise.direction.name}
          </span>
        )}
        {exercise.chain_type && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
            Cadena {exercise.chain_type}
          </span>
        )}
      </div>

      {exercise.primary_muscles.length > 0 && (
        <p className="text-sm text-gray-600">
          <span className="font-medium">Principales:</span>{' '}
          {exercise.primary_muscles.map((m) => m.name).join(', ')}
        </p>
      )}

      {exercise.videos.length > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          {exercise.videos.length} video{exercise.videos.length > 1 ? 's' : ''}
        </p>
      )}
    </button>
  )
}
