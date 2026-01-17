import { useState, useMemo } from 'react'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { ExerciseCard } from './ExerciseCard'
import { useMovementPatterns } from '../../hooks/useMovementPatterns'
import { useDirections } from '../../hooks/useDirections'
import { useMuscles } from '../../hooks/useMuscles'
import type { ExerciseWithRelations } from '../../lib/types'

interface ExerciseListProps {
  exercises: ExerciseWithRelations[]
  onSelect: (exercise: ExerciseWithRelations) => void
  loading?: boolean
}

export function ExerciseList({ exercises, onSelect, loading }: ExerciseListProps) {
  const { patterns } = useMovementPatterns()
  const { directions } = useDirections()
  const { muscles } = useMuscles()

  const [search, setSearch] = useState('')
  const [patternFilter, setPatternFilter] = useState('')
  const [directionFilter, setDirectionFilter] = useState('')
  const [muscleFilter, setMuscleFilter] = useState('')

  const filteredExercises = useMemo(() => {
    return exercises.filter((exercise) => {
      const matchesSearch = exercise.name.toLowerCase().includes(search.toLowerCase())
      const matchesPattern = !patternFilter || exercise.movement_pattern_id === patternFilter
      const matchesDirection = !directionFilter || exercise.direction_id === directionFilter
      const matchesMuscle = !muscleFilter ||
        exercise.primary_muscles.some((m) => m.id === muscleFilter) ||
        exercise.synergist_muscles.some((m) => m.id === muscleFilter)

      return matchesSearch && matchesPattern && matchesDirection && matchesMuscle
    })
  }, [exercises, search, patternFilter, directionFilter, muscleFilter])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Buscar ejercicio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            options={patterns.map((p) => ({ value: p.id, label: p.name }))}
            value={patternFilter}
            onChange={(e) => setPatternFilter(e.target.value)}
            placeholder="Todos los patrones"
          />
          <Select
            options={directions.map((d) => ({ value: d.id, label: d.name }))}
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
            placeholder="Todas las direcciones"
          />
          <Select
            options={muscles.map((m) => ({ value: m.id, label: m.name }))}
            value={muscleFilter}
            onChange={(e) => setMuscleFilter(e.target.value)}
            placeholder="Todos los músculos"
          />
        </div>
      </div>

      {filteredExercises.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {exercises.length === 0
              ? 'No hay ejercicios registrados'
              : 'No se encontraron ejercicios con los filtros aplicados'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onClick={() => onSelect(exercise)}
            />
          ))}
        </div>
      )}

      <p className="text-sm text-gray-500 text-center">
        {filteredExercises.length} de {exercises.length} ejercicios
      </p>
    </div>
  )
}
