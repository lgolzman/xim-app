import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { useAuth } from '../../context/AuthContext'
import type { ExerciseWithRelations } from '../../lib/types'

interface ExerciseDetailProps {
  exercise: ExerciseWithRelations
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
  showAdminActions?: boolean
  initialSection?: 'photos'
}

export function ExerciseDetail({ exercise, onEdit, onDelete, onClose, showAdminActions = true, initialSection }: ExerciseDetailProps) {
  const { isAdmin } = useAuth()
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)
  const photosRef = useRef<HTMLDivElement | null>(null)
  const photos = exercise.photos || []

  useEffect(() => {
    if (initialSection === 'photos' && photos.length > 0) {
      photosRef.current?.scrollIntoView({ block: 'start' })
    }
  }, [initialSection, photos.length])

  const safePhotoIndex = selectedPhotoIndex < photos.length ? selectedPhotoIndex : 0
  const selectedPhoto = photos[safePhotoIndex]
  const showPreviousPhoto = () => {
    setSelectedPhotoIndex((current) => (current === 0 ? photos.length - 1 : current - 1))
  }
  const showNextPhoto = () => {
    setSelectedPhotoIndex((current) => (current === photos.length - 1 ? 0 : current + 1))
  }

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

      {photos.length > 0 && selectedPhoto && (
        <div ref={photosRef}>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Fotos de referencia</h4>
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              <img
                src={selectedPhoto.public_url}
                alt={`${exercise.name} - foto ${selectedPhoto.display_order}`}
                className="max-h-[28rem] w-full object-contain"
              />
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={showPreviousPhoto}
                    className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow hover:bg-white"
                    aria-label="Foto anterior"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={showNextPhoto}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow hover:bg-white"
                    aria-label="Foto siguiente"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
            {photos.length > 1 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setSelectedPhotoIndex(index)}
                    className={`overflow-hidden rounded-md border ${
                      index === safePhotoIndex ? 'border-gray-900 ring-2 ring-gray-900/20' : 'border-gray-200'
                    }`}
                    aria-label={`Ver foto ${photo.display_order}`}
                  >
                    <img
                      src={photo.public_url}
                      alt={`${exercise.name} - miniatura ${photo.display_order}`}
                      className="h-20 w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
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
        {isAdmin && showAdminActions && (
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
