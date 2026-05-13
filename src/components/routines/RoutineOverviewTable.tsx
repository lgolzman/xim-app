import type { PrescribedSet, RoutineWithDays } from '../../lib/types'

interface RoutineOverviewTableProps {
  routine: RoutineWithDays
}

export function RoutineOverviewTable({ routine }: RoutineOverviewTableProps) {
  const weekNumbers = Array.from({ length: routine.total_weeks }, (_, index) => index + 1)

  return (
    <div className="space-y-6">
      {routine.routine_days.map(day => (
        <section key={day.id} className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Día {day.day_number}{day.name ? ` - ${day.name}` : ''}
            </h2>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-[880px] w-full border-collapse text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="w-48 px-3 py-2 text-left font-semibold text-gray-700">Ejercicio</th>
                  {weekNumbers.map(week => (
                    <th key={week} className="w-32 px-3 py-2 text-left font-semibold text-gray-700">
                      Sem {week}
                    </th>
                  ))}
                  <th className="w-56 px-3 py-2 text-left font-semibold text-gray-700">Nota</th>
                </tr>
              </thead>
              <tbody>
                {day.routine_blocks.flatMap(block => {
                  const blockRows = block.block_exercises.map(exercise => (
                    <tr key={exercise.id} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-3 py-3 align-top">
                        <div className="flex gap-2">
                          <span className="shrink-0 font-semibold text-gray-500">
                            {block.block_letter}{exercise.position}
                          </span>
                          <a
                            href={`/exercises/${exercise.exercise_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-gray-900 hover:text-blue-700 hover:underline"
                          >
                            {exercise.exercise?.name || 'Ejercicio sin nombre'}
                          </a>
                        </div>
                      </td>
                      {weekNumbers.map(week => (
                        <td key={week} className="px-3 py-3 align-top text-gray-700">
                          {formatWeekSets(exercise.prescribed_sets.filter(set => set.week_number === week))}
                        </td>
                      ))}
                      <td className="px-3 py-3 align-top text-gray-600">
                        {exercise.note || '—'}
                      </td>
                    </tr>
                  ))

                  return [
                    <tr key={block.id} className="bg-gray-100">
                      <td colSpan={weekNumbers.length + 2} className="px-3 py-2">
                        <span className="font-semibold text-gray-900">Bloque {block.block_letter}</span>
                        {block.block_exercises.length > 1 && (
                          <span className="ml-2 text-xs font-medium text-gray-500">superset</span>
                        )}
                      </td>
                    </tr>,
                    ...blockRows,
                  ]
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}

function formatWeekSets(sets: PrescribedSet[]) {
  if (sets.length === 0) return '—'

  const sortedSets = [...sets].sort((a, b) => a.set_number - b.set_number)
  const firstSet = sortedSets[0]
  const allEqual = sortedSets.every(set =>
    set.set_type === firstSet.set_type &&
    set.quantity === firstSet.quantity &&
    set.weight_kg === firstSet.weight_kg
  )

  if (allEqual) {
    return `${sortedSets.length}x${formatQuantity(firstSet)}${formatWeight(firstSet.weight_kg)}`
  }

  return sortedSets.map(set => `${formatQuantity(set)}${formatWeight(set.weight_kg)}`).join(' · ')
}

function formatQuantity(set: PrescribedSet) {
  return set.set_type === 'time' ? `${set.quantity}"` : `${set.quantity}`
}

function formatWeight(weight: number | null) {
  return weight === null ? '' : ` / ${weight}kg`
}
