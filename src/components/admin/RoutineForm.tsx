import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Modal } from '../ui/Modal'
import { useStudents } from '../../hooks/useStudents'
import { useExercises } from '../../hooks/useExercises'
import { getBlockColor } from '../../lib/blockColors'
import type { Exercise, SetType } from '../../lib/types'

// Tipos internos para el formulario
interface FormSet {
  id: string
  set_type: SetType
  quantity: number
  weight_kg: string // string para el input
}

interface FormWeekSets {
  week_number: number
  sets: FormSet[]
}

interface FormExercise {
  id: string
  exercise_id: string
  exercise?: Exercise
  position: number
  note: string
  weeks: FormWeekSets[]
}

interface FormBlock {
  id: string
  block_letter: string
  block_order: number
  exercises: FormExercise[]
}

interface FormDay {
  id: string
  day_number: number
  name: string
  blocks: FormBlock[]
}

interface FormData {
  student_id: string
  name: string
  total_weeks: number
  days: FormDay[]
}

interface RoutineFormProps {
  initialData?: FormData
  studentId?: string // Pre-selected student
  onSubmit: (data: FormData, action: 'draft' | 'active') => Promise<void>
  onCancel: () => void
  onChange?: (data: FormData) => void
  isEditing?: boolean
  routineStatus?: 'draft' | 'active' | 'archived'
  loading?: boolean
}

const BLOCK_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

// Generar ID único
const generateId = () => Math.random().toString(36).substring(2, 11)

// Crear sets vacíos para una semana
const createEmptySets = (count: number = 3): FormSet[] => {
  return Array.from({ length: count }, () => ({
    id: generateId(),
    set_type: 'reps' as SetType,
    quantity: 8,
    weight_kg: '',
  }))
}

// Crear weeks con sets vacíos
const createEmptyWeeks = (totalWeeks: number): FormWeekSets[] => {
  return Array.from({ length: totalWeeks }, (_, i) => ({
    week_number: i + 1,
    sets: createEmptySets(3),
  }))
}

const isWeekEmpty = (week: FormWeekSets) => {
  return week.sets.every(set => set.set_type === 'reps' && set.quantity === 8 && set.weight_kg.trim() === '')
}

export function RoutineForm({
  initialData,
  studentId,
  onSubmit,
  onCancel,
  onChange,
  isEditing = false,
  routineStatus,
  loading = false,
}: RoutineFormProps) {
  const { students, loading: studentsLoading } = useStudents()
  const { exercises, loading: exercisesLoading } = useExercises()

  const [formData, setFormData] = useState<FormData>(() => {
    if (initialData) return initialData
    return {
      student_id: studentId || '',
      name: '',
      total_weeks: 4,
      days: [{
        id: generateId(),
        day_number: 1,
        name: '',
        blocks: [{
          id: generateId(),
          block_letter: 'A',
          block_order: 0,
          exercises: [],
        }],
      }],
    }
  })

  const [exerciseModalOpen, setExerciseModalOpen] = useState(false)
  const [currentDayIndex, setCurrentDayIndex] = useState<number | null>(null)
  const [currentBlockIndex, setCurrentBlockIndex] = useState<number | null>(null)
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [selectedWeekByExerciseId, setSelectedWeekByExerciseId] = useState<Record<string, number>>({})
  const [collapsedDayIds, setCollapsedDayIds] = useState<Set<string>>(() => {
    const initialDays = initialData?.days || []
    return new Set(initialDays.slice(0, -1).map(day => day.id))
  })

  useEffect(() => {
    onChange?.(formData)
  }, [formData, onChange])

  // Filtrar ejercicios para el modal de selección
  const filteredExercises = exercises.filter(e =>
    e.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  )

  // Handlers básicos
  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const toggleDayCollapsed = (dayId: string) => {
    setCollapsedDayIds(prev => {
      const next = new Set(prev)
      if (next.has(dayId)) {
        next.delete(dayId)
      } else {
        next.add(dayId)
      }
      return next
    })
  }

  const getDaySummary = (day: FormDay) => {
    const blockCount = day.blocks.length
    const exerciseCount = day.blocks.reduce((total, block) => total + block.exercises.length, 0)
    return `${blockCount} ${blockCount === 1 ? 'bloque' : 'bloques'} · ${exerciseCount} ${exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}`
  }

  const getSelectedWeek = (exercise: FormExercise) => {
    const selectedWeek = selectedWeekByExerciseId[exercise.id] || 1
    return Math.min(selectedWeek, exercise.weeks.length || 1)
  }

  const setSelectedWeek = (exerciseId: string, week: number) => {
    setSelectedWeekByExerciseId(prev => ({ ...prev, [exerciseId]: week }))
  }

  // Cambiar total de semanas - ajusta los sets de todos los ejercicios
  const handleWeeksChange = (newWeeks: number) => {
    setFormData(prev => {
      const updatedDays = prev.days.map(day => ({
        ...day,
        blocks: day.blocks.map(block => ({
          ...block,
          exercises: block.exercises.map(ex => {
            const currentWeeks = ex.weeks.length
            if (newWeeks > currentWeeks) {
              // Agregar semanas
              const newWeeksData = Array.from({ length: newWeeks - currentWeeks }, (_, i) => ({
                week_number: currentWeeks + i + 1,
                sets: [...(ex.weeks[currentWeeks - 1]?.sets || createEmptySets(3))].map(s => ({
                  ...s,
                  id: generateId(),
                })),
              }))
              return { ...ex, weeks: [...ex.weeks, ...newWeeksData] }
            } else {
              // Quitar semanas
              return { ...ex, weeks: ex.weeks.slice(0, newWeeks) }
            }
          }),
        })),
      }))
      return { ...prev, total_weeks: newWeeks, days: updatedDays }
    })
  }

  // Agregar día
  const addDay = () => {
    const newDayNumber = formData.days.length + 1
    const newDayId = generateId()
    setCollapsedDayIds(new Set(formData.days.map(day => day.id)))
    setFormData(prev => ({
      ...prev,
      days: [...prev.days, {
        id: newDayId,
        day_number: newDayNumber,
        name: '',
        blocks: [{
          id: generateId(),
          block_letter: 'A',
          block_order: 0,
          exercises: [],
        }],
      }],
    }))
  }

  // Eliminar día
  const removeDay = (dayIndex: number) => {
    if (formData.days.length <= 1) return
    const dayId = formData.days[dayIndex].id
    setCollapsedDayIds(prev => {
      const next = new Set(prev)
      next.delete(dayId)
      return next
    })
    setFormData(prev => ({
      ...prev,
      days: prev.days
        .filter((_, i) => i !== dayIndex)
        .map((day, i) => ({ ...day, day_number: i + 1 })),
    }))
  }

  // Agregar bloque a un día
  const addBlock = (dayIndex: number) => {
    const day = formData.days[dayIndex]
    const usedLetters = day.blocks.map(b => b.block_letter)
    const nextLetter = BLOCK_LETTERS.find(l => !usedLetters.includes(l)) || 'X'

    setFormData(prev => ({
      ...prev,
      days: prev.days.map((d, i) => {
        if (i !== dayIndex) return d
        return {
          ...d,
          blocks: [...d.blocks, {
            id: generateId(),
            block_letter: nextLetter,
            block_order: d.blocks.length,
            exercises: [],
          }],
        }
      }),
    }))
  }

  // Eliminar bloque
  const removeBlock = (dayIndex: number, blockIndex: number) => {
    const day = formData.days[dayIndex]
    if (day.blocks.length <= 1) return

    setFormData(prev => ({
      ...prev,
      days: prev.days.map((d, i) => {
        if (i !== dayIndex) return d
        return {
          ...d,
          blocks: d.blocks
            .filter((_, bi) => bi !== blockIndex)
            .map((b, bi) => ({ ...b, block_order: bi })),
        }
      }),
    }))
  }

  // Abrir modal para agregar ejercicio
  const openExerciseModal = (dayIndex: number, blockIndex: number) => {
    setCurrentDayIndex(dayIndex)
    setCurrentBlockIndex(blockIndex)
    setExerciseSearch('')
    setExerciseModalOpen(true)
  }

  // Agregar ejercicio al bloque
  const addExercise = (exercise: Exercise) => {
    if (currentDayIndex === null || currentBlockIndex === null) return

    const block = formData.days[currentDayIndex].blocks[currentBlockIndex]
    const newPosition = block.exercises.length + 1

    setFormData(prev => ({
      ...prev,
      days: prev.days.map((d, di) => {
        if (di !== currentDayIndex) return d
        return {
          ...d,
          blocks: d.blocks.map((b, bi) => {
            if (bi !== currentBlockIndex) return b
            return {
              ...b,
              exercises: [...b.exercises, {
                id: generateId(),
                exercise_id: exercise.id,
                exercise: exercise,
                position: newPosition,
                note: '',
                weeks: createEmptyWeeks(prev.total_weeks),
              }],
            }
          }),
        }
      }),
    }))

    setExerciseModalOpen(false)
  }

  // Eliminar ejercicio
  const removeExercise = (dayIndex: number, blockIndex: number, exerciseIndex: number) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.map((d, di) => {
        if (di !== dayIndex) return d
        return {
          ...d,
          blocks: d.blocks.map((b, bi) => {
            if (bi !== blockIndex) return b
            return {
              ...b,
              exercises: b.exercises
                .filter((_, ei) => ei !== exerciseIndex)
                .map((e, ei) => ({ ...e, position: ei + 1 })),
            }
          }),
        }
      }),
    }))
  }

  // Actualizar nota del ejercicio
  const updateExerciseNote = (dayIndex: number, blockIndex: number, exerciseIndex: number, note: string) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.map((d, di) => {
        if (di !== dayIndex) return d
        return {
          ...d,
          blocks: d.blocks.map((b, bi) => {
            if (bi !== blockIndex) return b
            return {
              ...b,
              exercises: b.exercises.map((e, ei) => {
                if (ei !== exerciseIndex) return e
                return { ...e, note }
              }),
            }
          }),
        }
      }),
    }))
  }

  // Actualizar set
  const updateSet = (
    dayIndex: number,
    blockIndex: number,
    exerciseIndex: number,
    weekIndex: number,
    setIndex: number,
    updates: Partial<FormSet>
  ) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.map((d, di) => {
        if (di !== dayIndex) return d
        return {
          ...d,
          blocks: d.blocks.map((b, bi) => {
            if (bi !== blockIndex) return b
            return {
              ...b,
              exercises: b.exercises.map((e, ei) => {
                if (ei !== exerciseIndex) return e
                return {
                  ...e,
                  weeks: e.weeks.map((w, wi) => {
                    if (wi !== weekIndex) return w
                    return {
                      ...w,
                      sets: w.sets.map((s, si) => {
                        if (si !== setIndex) return s
                        return { ...s, ...updates }
                      }),
                    }
                  }),
                }
              }),
            }
          }),
        }
      }),
    }))
  }

  // Agregar serie a un ejercicio en una semana
  const addSet = (dayIndex: number, blockIndex: number, exerciseIndex: number, weekIndex: number) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.map((d, di) => {
        if (di !== dayIndex) return d
        return {
          ...d,
          blocks: d.blocks.map((b, bi) => {
            if (bi !== blockIndex) return b
            return {
              ...b,
              exercises: b.exercises.map((e, ei) => {
                if (ei !== exerciseIndex) return e
                return {
                  ...e,
                  weeks: e.weeks.map((w, wi) => {
                    if (wi !== weekIndex) return w
                    const lastSet = w.sets[w.sets.length - 1]
                    return {
                      ...w,
                      sets: [...w.sets, {
                        id: generateId(),
                        set_type: lastSet?.set_type || 'reps',
                        quantity: lastSet?.quantity || 8,
                        weight_kg: lastSet?.weight_kg || '',
                      }],
                    }
                  }),
                }
              }),
            }
          }),
        }
      }),
    }))
  }

  // Eliminar serie
  const removeSet = (dayIndex: number, blockIndex: number, exerciseIndex: number, weekIndex: number, setIndex: number) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.map((d, di) => {
        if (di !== dayIndex) return d
        return {
          ...d,
          blocks: d.blocks.map((b, bi) => {
            if (bi !== blockIndex) return b
            return {
              ...b,
              exercises: b.exercises.map((e, ei) => {
                if (ei !== exerciseIndex) return e
                return {
                  ...e,
                  weeks: e.weeks.map((w, wi) => {
                    if (wi !== weekIndex) return w
                    if (w.sets.length <= 1) return w // Mantener al menos 1 serie
                    return {
                      ...w,
                      sets: w.sets.filter((_, si) => si !== setIndex),
                    }
                  }),
                }
              }),
            }
          }),
        }
      }),
    }))
  }

  // Copiar semana anterior
  const copySetsFromPreviousWeek = (dayIndex: number, blockIndex: number, exerciseIndex: number, weekIndex: number) => {
    if (weekIndex === 0) return

    setFormData(prev => ({
      ...prev,
      days: prev.days.map((d, di) => {
        if (di !== dayIndex) return d
        return {
          ...d,
          blocks: d.blocks.map((b, bi) => {
            if (bi !== blockIndex) return b
            return {
              ...b,
              exercises: b.exercises.map((e, ei) => {
                if (ei !== exerciseIndex) return e
                const previousWeek = e.weeks[weekIndex - 1]
                return {
                  ...e,
                  weeks: e.weeks.map((w, wi) => {
                    if (wi !== weekIndex) return w
                    return {
                      ...w,
                      sets: previousWeek.sets.map(s => ({
                        ...s,
                        id: generateId(),
                      })),
                    }
                  }),
                }
              }),
            }
          }),
        }
      }),
    }))
  }

  const replicateWeekOneToRest = (dayIndex: number, blockIndex: number, exerciseIndex: number) => {
    const exercise = formData.days[dayIndex]?.blocks[blockIndex]?.exercises[exerciseIndex]
    const weekOne = exercise?.weeks[0]
    const targetWeeks = exercise?.weeks.slice(1) || []

    if (!weekOne || targetWeeks.length === 0) return

    const weeksWithData = targetWeeks
      .filter(week => !isWeekEmpty(week))
      .map(week => week.week_number)

    if (weeksWithData.length > 0) {
      const message = `Las semanas ${weeksWithData.join(', ')} ya tienen series. ¿Querés reemplazarlas con las de la Semana 1?`
      if (!window.confirm(message)) return
    }

    setFormData(prev => ({
      ...prev,
      days: prev.days.map((d, di) => {
        if (di !== dayIndex) return d
        return {
          ...d,
          blocks: d.blocks.map((b, bi) => {
            if (bi !== blockIndex) return b
            return {
              ...b,
              exercises: b.exercises.map((e, ei) => {
                if (ei !== exerciseIndex) return e
                const sourceWeek = e.weeks[0]
                return {
                  ...e,
                  weeks: e.weeks.map((w, wi) => {
                    if (wi === 0) return w
                    return {
                      ...w,
                      sets: sourceWeek.sets.map(set => ({
                        ...set,
                        id: generateId(),
                      })),
                    }
                  }),
                }
              }),
            }
          }),
        }
      }),
    }))
  }

  // Validar formulario
  const isValid = () => {
    if (!formData.student_id) return false
    if (!formData.name.trim()) return false
    if (formData.days.length === 0) return false

    // Verificar que al menos un día tenga ejercicios
    const hasExercises = formData.days.some(d =>
      d.blocks.some(b => b.exercises.length > 0)
    )
    return hasExercises
  }

  const handleSubmit = async (action: 'draft' | 'active') => {
    if (!isValid()) return
    await onSubmit(formData, action)
  }

  const isActiveRoutine = routineStatus === 'active'
  const isArchivedRoutine = routineStatus === 'archived'

  return (
    <div className="space-y-6">
      {/* Datos básicos */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos de la rutina</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {!isEditing && (
            <Select
              label="Alumno"
              value={formData.student_id}
              onChange={(e) => updateFormData({ student_id: e.target.value })}
              options={students.map(s => {
                const studentName = s.full_name || s.name
                const selfLabel = s.role === 'admin' ? ' · Entrenadora' : ''
                const emailLabel = s.email ? ` (${s.email})` : ''
                return { value: s.id, label: studentName ? `${studentName}${emailLabel}${selfLabel}` : `Alumno sin nombre${selfLabel}` }
              })}
              placeholder="Seleccionar alumno"
              disabled={!!studentId || studentsLoading}
            />
          )}
          <Input
            label="Nombre de la rutina"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            placeholder="Ej: Mayo 2026"
          />
          <Select
            label="Semanas"
            value={formData.total_weeks.toString()}
            onChange={(e) => handleWeeksChange(parseInt(e.target.value))}
            options={[
              { value: '2', label: '2 semanas' },
              { value: '3', label: '3 semanas' },
              { value: '4', label: '4 semanas' },
              { value: '5', label: '5 semanas' },
              { value: '6', label: '6 semanas' },
            ]}
          />
        </div>
      </div>

      {/* Días */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 space-y-4">
          {formData.days.map((day, dayIndex) => {
            const isCollapsed = collapsedDayIds.has(day.id)

            return (
              <div key={day.id} className="border border-gray-200 rounded-lg">
                <div
                  className={`bg-gray-50 px-4 py-3 flex items-center justify-between gap-3 cursor-pointer ${
                    isCollapsed ? 'rounded-lg' : 'rounded-t-lg'
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-expanded={!isCollapsed}
                  onClick={() => toggleDayCollapsed(day.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleDayCollapsed(day.id)
                    }
                  }}
                >
                  <div className="flex flex-1 items-center gap-3 min-w-0">
                    <span className="text-sm text-gray-500 w-4" aria-hidden="true">
                      {isCollapsed ? '▶' : '▼'}
                    </span>
                    <span className="font-semibold text-gray-900 whitespace-nowrap">
                      Día {day.day_number}
                    </span>
                    {isCollapsed && (
                      <span className="text-sm text-gray-500 truncate">
                        — {getDaySummary(day)}
                      </span>
                    )}
                    <div
                      className="w-40 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <Input
                        value={day.name}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            days: prev.days.map((d, i) =>
                              i === dayIndex ? { ...d, name: e.target.value } : d
                            ),
                          }))
                        }}
                        placeholder="Nombre opcional"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        addBlock(dayIndex)
                      }}
                    >
                      + Bloque
                    </Button>
                    {formData.days.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeDay(dayIndex)
                        }}
                      >
                        Eliminar día
                      </Button>
                    )}
                  </div>
                </div>

              {/* Bloques */}
              {!isCollapsed && (
                <div className="p-4 space-y-4">
                {day.blocks.map((block, blockIndex) => {
                  const blockColor = getBlockColor(block.block_letter)

                  return (
                  <div key={block.id} className={`border ${blockColor.border} ${blockColor.bg} rounded-lg`}>
                    <div className="px-3 py-2 flex items-center justify-between rounded-t-lg">
                      <span className="font-medium text-gray-700">Bloque {block.block_letter}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openExerciseModal(dayIndex, blockIndex)}
                        >
                          + Ejercicio
                        </Button>
                        {day.blocks.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => removeBlock(dayIndex, blockIndex)}
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Ejercicios del bloque */}
                    <div className="p-3 space-y-3">
                      {block.exercises.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-2">
                          Sin ejercicios. Agregá uno con el botón + Ejercicio.
                        </p>
                      ) : (
                        block.exercises.map((exercise, exerciseIndex) => {
                          const selectedWeek = getSelectedWeek(exercise)
                          const selectedWeekIndex = selectedWeek - 1
                          const selectedWeekSets = exercise.weeks[selectedWeekIndex]?.sets || []

                          return (
                            <div
                              key={exercise.id}
                              className="bg-white border border-gray-200 rounded-lg p-3"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <span className="text-xs text-gray-500 font-medium">
                                    {block.block_letter}{exercise.position}
                                  </span>
                                  <h4 className="font-medium text-gray-900">
                                    {exercise.exercise?.name || 'Ejercicio'}
                                  </h4>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600"
                                  onClick={() => removeExercise(dayIndex, blockIndex, exerciseIndex)}
                                >
                                  ×
                                </Button>
                              </div>

                              {/* Nota del ejercicio */}
                              <Input
                                value={exercise.note}
                                onChange={(e) => updateExerciseNote(dayIndex, blockIndex, exerciseIndex, e.target.value)}
                                placeholder="Nota (ej: Pausa de 2 segundos)"
                                className="mb-3 text-sm"
                              />

                              <div className="mb-3 overflow-x-auto">
                                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                                  {exercise.weeks.map(week => (
                                    <button
                                      key={week.week_number}
                                      type="button"
                                      onClick={() => setSelectedWeek(exercise.id, week.week_number)}
                                      className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                                        selectedWeek === week.week_number
                                          ? 'bg-white text-gray-900 shadow-sm'
                                          : 'text-gray-500 hover:text-gray-700'
                                      }`}
                                    >
                                      Sem {week.week_number}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Series de la semana seleccionada */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-medium text-gray-500">
                                    Series - Semana {selectedWeek}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {selectedWeek > 1 && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs"
                                        onClick={() => copySetsFromPreviousWeek(dayIndex, blockIndex, exerciseIndex, selectedWeekIndex)}
                                      >
                                        Copiar semana anterior
                                      </Button>
                                    )}
                                    {selectedWeek === 1 && formData.total_weeks > 1 && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs"
                                        onClick={() => replicateWeekOneToRest(dayIndex, blockIndex, exerciseIndex)}
                                      >
                                        Replicar Semana 1 en el resto
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => addSet(dayIndex, blockIndex, exerciseIndex, selectedWeekIndex)}
                                    >
                                      + Serie
                                    </Button>
                                  </div>
                                </div>

                                {selectedWeekSets.map((set, setIndex) => (
                                  <div key={set.id} className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 w-6">{setIndex + 1}.</span>
                                    <Select
                                      value={set.set_type}
                                      onChange={(e) => updateSet(dayIndex, blockIndex, exerciseIndex, selectedWeekIndex, setIndex, { set_type: e.target.value as SetType })}
                                      options={[
                                        { value: 'reps', label: 'Reps' },
                                        { value: 'time', label: 'Seg' },
                                      ]}
                                      className="w-20"
                                    />
                                    <Input
                                      type="number"
                                      value={set.quantity}
                                      onChange={(e) => updateSet(dayIndex, blockIndex, exerciseIndex, selectedWeekIndex, setIndex, { quantity: parseInt(e.target.value) || 0 })}
                                      className="w-16"
                                      min={1}
                                    />
                                    <Input
                                      value={set.weight_kg}
                                      onChange={(e) => updateSet(dayIndex, blockIndex, exerciseIndex, selectedWeekIndex, setIndex, { weight_kg: e.target.value })}
                                      placeholder="kg"
                                      className="w-20"
                                    />
                                    {selectedWeekSets.length > 1 && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-600 px-1"
                                        onClick={() => removeSet(dayIndex, blockIndex, exerciseIndex, selectedWeekIndex, setIndex)}
                                      >
                                        ×
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                  )
                })}
                </div>
              )}
            </div>
            )
          })}

          <Button variant="secondary" onClick={addDay} className="w-full">
            + Agregar día
          </Button>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        {isActiveRoutine ? (
          <Button
            onClick={() => handleSubmit('active')}
            disabled={loading || !isValid()}
          >
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        ) : !isArchivedRoutine && (
          <>
            <Button
              variant="secondary"
              onClick={() => handleSubmit('draft')}
              disabled={loading || !isValid()}
            >
              {loading ? 'Guardando...' : 'Guardar como borrador'}
            </Button>
            <Button
              onClick={() => handleSubmit('active')}
              disabled={loading || !isValid()}
            >
              {loading ? 'Guardando...' : 'Guardar y activar'}
            </Button>
          </>
        )}
      </div>

      {/* Modal de selección de ejercicio */}
      <Modal
        isOpen={exerciseModalOpen}
        onClose={() => setExerciseModalOpen(false)}
        title="Seleccionar ejercicio"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            value={exerciseSearch}
            onChange={(e) => setExerciseSearch(e.target.value)}
            placeholder="Buscar ejercicio..."
          />

          <div className="max-h-96 overflow-y-auto space-y-1">
            {exercisesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              </div>
            ) : filteredExercises.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No se encontraron ejercicios</p>
            ) : (
              filteredExercises.map(exercise => (
                <button
                  key={exercise.id}
                  onClick={() => addExercise(exercise)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors"
                >
                  <span className="font-medium text-gray-900">{exercise.name}</span>
                  {exercise.movement_pattern && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({exercise.movement_pattern.name})
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

// Export del tipo para usar en las páginas
export type { FormData as RoutineFormData, FormDay, FormBlock, FormExercise, FormWeekSets, FormSet }
