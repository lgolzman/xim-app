import { Button } from '../ui/Button'
import { useAuth } from '../../context/AuthContext'
import type { ExerciseWithRelations } from '../../lib/types'

interface ExerciseDetailProps {
  exercise: ExerciseWithRelations
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

export function ExerciseDetail({ exercise, onEdit, onDelete, onClose }: ExerciseDetailProps) {
  const { isAdmin } = useAuth()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {exercise.movement_pattern && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
            {exercise.movement_pattern.name}
          </span>
        )}
        {exercise.direction && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700">
            {exercise.direction.name}
          </span>
        )}
        {exercise.chain_type && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-700">
            Cadena {exercise.chain_type}
          </span>
        )}
      </div>

      {exercise.primary_muscles.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Músculos principales</h4>
          <div className="flex flex-wrap gap-1">
            {exercise.primary_muscles.map((muscle) => (
              <span
                key={muscle.id}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
              >
                {muscle.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {exercise.synergist_muscles.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Músculos sinergistas</h4>
          <div className="flex flex-wrap gap-1">
            {exercise.synergist_muscles.map((muscle) => (
              <span
                key={muscle.id}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
              >
                {muscle.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {exercise.execution_tips && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Tips de ejecución</h4>
          <p className="text-gray-600 whitespace-pre-wrap">{exercise.execution_tips}</p>
        </div>
      )}

      {exercise.videos.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Videos de referencia</h4>
          <div className="space-y-2">
            {exercise.videos.map((video) => (
              <a
                key={video.id}
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {video.title || video.url}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
        {isAdmin && (
          <>
            <Button variant="danger" onClick={onDelete}>
              Eliminar
            </Button>
            <Button onClick={onEdit}>
              Editar
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
