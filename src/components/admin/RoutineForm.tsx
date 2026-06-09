import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Modal } from '../ui/Modal'
import { useStudents } from '../../hooks/useStudents'
import { useExercises } from '../../hooks/useExercises'
import { useMovementPatterns } from '../../hooks/useMovementPatterns'
import { useDirections } from '../../hooks/useDirections'
import { getBlockColor } from '../../lib/blockColors'
import { supabase } from '../../lib/supabase'
import type { ChainType, Exercise, ExerciseInRoutine, LoggedSet, PrescribedSet, SetType } from '../../lib/types'

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
  exercise?: ExerciseInRoutine
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

interface LastExerciseExecution {
  completed_at: string
  routine_name: string
  week_number: number
  prescribed: string
  registered: string
}

interface ExerciseHistoryRow {
  completed_at: string
  week_number: number
  routine: { name: string } | null
  logged_sets: LoggedSet[]
  routine_day: {
    routine_blocks: Array<{
      block_exercises: Array<{
        id: string
        exercise_id: string
        prescribed_sets: PrescribedSet[]
      }>
    }>
  } | null
}

interface RoutineFormProps {
  initialData?: FormData
  studentId?: string // Pre-selected student
  onSubmit: (data: FormData, action: 'draft' | 'active') => Promise<void>
  onAutoSave?: (data: FormData) => Promise<void>
  onCancel: () => void | Promise<void>
  onChange?: (data: FormData) => void
  isEditing?: boolean
  routineStatus?: 'draft' | 'active' | 'archived'
  loading?: boolean
}

const BLOCK_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const ROUTINE_EDITOR_VIEW_KEY = 'xim_routine_editor_view'
const AUTO_SAVE_DEBOUNCE_MS = 15000

type RoutineEditorView = 'compact' | 'detailed'

// Generar ID único
const generateId = () => Math.random().toString(36).substring(2, 11)

const getInitialEditorView = (): RoutineEditorView => {
  if (typeof window === 'undefined') return 'detailed'
  return window.localStorage.getItem(ROUTINE_EDITOR_VIEW_KEY) === 'compact' ? 'compact' : 'detailed'
}

const sortBlocksByLetter = (blocks: FormBlock[]) => {
  return [...blocks]
    .sort((a, b) => a.block_letter.localeCompare(b.block_letter))
    .map((block, index) => ({ ...block, block_order: index }))
}

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

const formatSet = (set: FormSet) => {
  const quantity = set.set_type === 'time' ? `${set.quantity}"` : `${set.quantity} reps`
  const weight = set.weight_kg.trim() ? ` / ${set.weight_kg.trim()}kg` : ''
  return `${quantity}${weight}`
}

const areSetsEqual = (a: FormSet, b: FormSet) => (
  a.set_type === b.set_type &&
  a.quantity === b.quantity &&
  a.weight_kg.trim() === b.weight_kg.trim()
)

const formatPrescribedHistorySet = (set: PrescribedSet) => {
  const quantity = set.set_type === 'time' ? `${set.quantity}"` : `${set.quantity}`
  const weight = set.weight_kg === null ? '' : ` / ${set.weight_kg}kg`
  return `${quantity}${weight}`
}

const formatLoggedHistorySet = (set: LoggedSet) => {
  const quantity = set.actual_seconds ?? set.actual_reps
  const weight = set.actual_weight_kg === null ? '' : ` / ${set.actual_weight_kg}kg`
  if (!quantity && set.actual_weight_kg === null) return null
  return `${quantity ?? '—'}${weight}`
}

const summarizePrescribedSets = (sets: PrescribedSet[]) => {
  if (sets.length === 0) return 'Sin prescripción'

  const sortedSets = [...sets].sort((a, b) => a.set_number - b.set_number)
  const firstSet = sortedSets[0]
  const allEqual = sortedSets.every(set =>
    set.set_type === firstSet.set_type &&
    set.quantity === firstSet.quantity &&
    set.weight_kg === firstSet.weight_kg
  )

  if (allEqual) {
    return `${sortedSets.length}×${formatPrescribedHistorySet(firstSet)}`
  }

  return sortedSets.map(formatPrescribedHistorySet).join(', ')
}

const summarizeLoggedSets = (sets: LoggedSet[]) => {
  const sortedValues = [...sets]
    .sort((a, b) => a.set_number - b.set_number)
    .map(formatLoggedHistorySet)
    .filter((value): value is string => Boolean(value))

  if (sortedValues.length === 0) return 'Sin registro'

  const firstValue = sortedValues[0]
  const allEqual = sortedValues.every(value => value === firstValue)

  if (allEqual) {
    return `${sortedValues.length}×${firstValue}`
  }

  return sortedValues.join(', ')
}

export function RoutineForm({
  initialData,
  studentId,
  onSubmit,
  onAutoSave,
  onCancel,
  onChange,
  isEditing = false,
  routineStatus,
  loading = false,
}: RoutineFormProps) {
  const { students, loading: studentsLoading } = useStudents()
  const { exercises, loading: exercisesLoading } = useExercises()
  const { patterns } = useMovementPatterns()
  const { directions } = useDirections()

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
  const [editorView, setEditorView] = useState<RoutineEditorView>(getInitialEditorView)

  const [exerciseModalOpen, setExerciseModalOpen] = useState(false)
  const [currentDayIndex, setCurrentDayIndex] = useState<number | null>(null)
  const [currentBlockIndex, setCurrentBlockIndex] = useState<number | null>(null)
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [exercisePatternFilter, setExercisePatternFilter] = useState('')
  const [exerciseDirectionFilter, setExerciseDirectionFilter] = useState('')
  const [exerciseChainFilter, setExerciseChainFilter] = useState<ChainType | ''>('')
  const [exerciseHistory, setExerciseHistory] = useState<Record<string, LastExerciseExecution>>({})
  const [exerciseHistoryLoading, setExerciseHistoryLoading] = useState(false)
  const [exerciseHistoryError, setExerciseHistoryError] = useState<string | null>(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null)
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null)
  const [selectedWeekByExerciseId, setSelectedWeekByExerciseId] = useState<Record<string, number>>({})
  const [expandedProgressionIds, setExpandedProgressionIds] = useState<Set<string>>(new Set())
  const [collapsedDayIds, setCollapsedDayIds] = useState<Set<string>>(() => {
    const initialDays = initialData?.days || []
    return new Set(initialDays.slice(0, -1).map(day => day.id))
  })
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSaveInFlightRef = useRef(false)
  const autoSavePendingRef = useRef(false)
  const autoSavePromiseRef = useRef<Promise<void> | null>(null)
  const latestFormDataRef = useRef(formData)
  const onAutoSaveRef = useRef(onAutoSave)
  const didMountRef = useRef(false)
  const isActiveRoutine = routineStatus === 'active'
  const isArchivedRoutine = routineStatus === 'archived'
  const hasRoutineName = formData.name.trim().length > 0
  const hasAutoSave = Boolean(onAutoSave)

  // Validar formulario
  const isValid = useCallback(() => {
    if (!formData.student_id) return false
    if (!formData.name.trim()) return false
    if (formData.days.length === 0) return false

    // Verificar que al menos un día tenga ejercicios
    const hasExercises = formData.days.some(d =>
      d.blocks.some(b => b.exercises.length > 0)
    )
    return hasExercises
  }, [formData])

  useEffect(() => {
    latestFormDataRef.current = formData
    onChange?.(formData)
  }, [formData, onChange])

  useEffect(() => {
    onAutoSaveRef.current = onAutoSave
  }, [onAutoSave])

  const runAutoSave = useCallback((data: FormData) => {
    if (!onAutoSaveRef.current) return

    if (autoSaveInFlightRef.current) {
      autoSavePendingRef.current = true
      return
    }

    autoSaveInFlightRef.current = true
    setAutoSaveStatus('saving')
    setAutoSaveError(null)

    const autoSavePromise = onAutoSaveRef.current(data)
    autoSavePromiseRef.current = autoSavePromise

    autoSavePromise
      .then(() => {
        setAutoSaveStatus('saved')
        setAutoSavedAt(new Date())
      })
      .catch((err) => {
        setAutoSaveError(err instanceof Error ? err.message : 'No se pudo guardar el borrador')
        setAutoSaveStatus('error')
      })
      .finally(() => {
        autoSaveInFlightRef.current = false
        autoSavePromiseRef.current = null

        if (autoSavePendingRef.current) {
          autoSavePendingRef.current = false
          runAutoSave(latestFormDataRef.current)
        }
      })
  }, [])

  useEffect(() => {
    if (!hasAutoSave || isArchivedRoutine || loading) return

    if (!didMountRef.current) {
      didMountRef.current = true
      return
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    if (!isValid()) {
      setAutoSaveStatus('idle')
      return
    }

    autoSaveTimerRef.current = setTimeout(() => {
      runAutoSave(formData)
    }, AUTO_SAVE_DEBOUNCE_MS)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [formData, hasAutoSave, isArchivedRoutine, isValid, loading, runAutoSave])

  const selectedStudentId = studentId || formData.student_id

  useEffect(() => {
    if (!exerciseModalOpen || !selectedStudentId) {
      setExerciseHistory({})
      setExerciseHistoryLoading(false)
      setExerciseHistoryError(null)
      return
    }

    let isCancelled = false

    const fetchExerciseHistory = async () => {
      setExerciseHistoryLoading(true)
      setExerciseHistoryError(null)

      try {
        const { data: latestLog, error: latestLogError } = await supabase
          .from('workout_logs')
          .select('id')
          .eq('student_id', selectedStudentId)
          .order('completed_at', { ascending: false })
          .limit(1)

        if (latestLogError) throw latestLogError
        if (isCancelled) return

        if (!latestLog || latestLog.length === 0) {
          setExerciseHistory({})
          return
        }

        const { data, error } = await supabase
          .from('workout_logs')
          .select(`
            completed_at,
            week_number,
            routine:routines(name),
            logged_sets(*),
            routine_day:routine_days(
              routine_blocks(
                block_exercises(
                  id,
                  exercise_id,
                  prescribed_sets(*)
                )
              )
            )
          `)
          .eq('student_id', selectedStudentId)
          .order('completed_at', { ascending: false })
          .limit(200)

        if (error) throw error
        if (isCancelled) return

        const historyByExercise: Record<string, LastExerciseExecution> = {}
        const rows = (data || []) as unknown as ExerciseHistoryRow[]

        rows.forEach(row => {
          row.routine_day?.routine_blocks.forEach(block => {
            block.block_exercises.forEach(blockExercise => {
              if (historyByExercise[blockExercise.exercise_id]) return

              const prescribedSets = blockExercise.prescribed_sets.filter(set => set.week_number === row.week_number)
              const loggedSets = row.logged_sets.filter(set => set.block_exercise_id === blockExercise.id)

              historyByExercise[blockExercise.exercise_id] = {
                completed_at: row.completed_at,
                routine_name: row.routine?.name || 'Rutina',
                week_number: row.week_number,
                prescribed: summarizePrescribedSets(prescribedSets),
                registered: summarizeLoggedSets(loggedSets),
              }
            })
          })
        })

        setExerciseHistory(historyByExercise)
      } catch {
        if (!isCancelled) {
          setExerciseHistory({})
          setExerciseHistoryError(null)
        }
      } finally {
        if (!isCancelled) {
          setExerciseHistoryLoading(false)
        }
      }
    }

    void fetchExerciseHistory()

    return () => {
      isCancelled = true
    }
  }, [exerciseModalOpen, selectedStudentId])

  // Filtrar ejercicios para el modal de selección
  const filteredExercises = exercises.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(exerciseSearch.toLowerCase())
    const matchesPattern = !exercisePatternFilter || e.movement_pattern_id === exercisePatternFilter
    const matchesDirection = !exerciseDirectionFilter || e.direction_id === exerciseDirectionFilter
    const matchesChain = !exerciseChainFilter || e.chain_type === exerciseChainFilter

    return matchesSearch && matchesPattern && matchesDirection && matchesChain
  })

  const hasExerciseFilters = Boolean(
    exerciseSearch ||
    exercisePatternFilter ||
    exerciseDirectionFilter ||
    exerciseChainFilter
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

  const toggleProgression = (exerciseId: string) => {
    setExpandedProgressionIds(prev => {
      const next = new Set(prev)
      if (next.has(exerciseId)) {
        next.delete(exerciseId)
      } else {
        next.add(exerciseId)
      }
      return next
    })
  }

  const clearExerciseFilters = () => {
    setExerciseSearch('')
    setExercisePatternFilter('')
    setExerciseDirectionFilter('')
    setExerciseChainFilter('')
  }

  const handleEditorViewChange = (view: RoutineEditorView) => {
    setEditorView(view)
    window.localStorage.setItem(ROUTINE_EDITOR_VIEW_KEY, view)
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
    if (!hasRoutineName) return

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
    if (!hasRoutineName) return

    const day = formData.days[dayIndex]
    const usedLetters = day.blocks.map(b => b.block_letter)
    const nextLetter = BLOCK_LETTERS.find(l => !usedLetters.includes(l)) || 'X'

    setFormData(prev => ({
      ...prev,
      days: prev.days.map((d, i) => {
        if (i !== dayIndex) return d
        return {
          ...d,
          blocks: sortBlocksByLetter([...d.blocks, {
            id: generateId(),
            block_letter: nextLetter,
            block_order: 0,
            exercises: [],
          }]),
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
          blocks: sortBlocksByLetter(d.blocks.filter((_, bi) => bi !== blockIndex)),
        }
      }),
    }))
  }

  // Abrir modal para agregar ejercicio
  const openExerciseModal = (dayIndex: number, blockIndex: number) => {
    if (!hasRoutineName) return

    setCurrentDayIndex(dayIndex)
    setCurrentBlockIndex(blockIndex)
    clearExerciseFilters()
    setExerciseModalOpen(true)
  }

  // Agregar ejercicio al bloque
  const addExercise = (exercise: Exercise) => {
    if (!hasRoutineName) return
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

  const copySetFromPrevious = (
    dayIndex: number,
    blockIndex: number,
    exerciseIndex: number,
    weekIndex: number,
    setIndex: number
  ) => {
    if (setIndex === 0) return

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
                    const sourceSet = w.sets[setIndex - 1]
                    if (!sourceSet) return w
                    return {
                      ...w,
                      sets: w.sets.map((set, si) => (
                        si === setIndex
                          ? {
                              ...set,
                              set_type: sourceSet.set_type,
                              quantity: sourceSet.quantity,
                              weight_kg: sourceSet.weight_kg,
                            }
                          : set
                      )),
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

  const equalizeWeekSets = (dayIndex: number, blockIndex: number, exerciseIndex: number, weekIndex: number) => {
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
                    const firstSet = w.sets[0]
                    if (!firstSet || w.sets.length <= 1) return w
                    return {
                      ...w,
                      sets: w.sets.map((set, si) => (
                        si === 0
                          ? set
                          : {
                              ...set,
                              set_type: firstSet.set_type,
                              quantity: firstSet.quantity,
                              weight_kg: firstSet.weight_kg,
                            }
                      )),
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

  const handleSubmit = async (action: 'draft' | 'active') => {
    if (!isValid()) return
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    if (autoSavePromiseRef.current) {
      await autoSavePromiseRef.current.catch(() => undefined)
    }
    await onSubmit(formData, action)
  }

  const handleCancel = async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    if (autoSavePromiseRef.current) {
      await autoSavePromiseRef.current.catch(() => undefined)
    }
    await onCancel()
  }

  return (
    <div className="space-y-6">
      {onAutoSave && !isArchivedRoutine && (
        <div className="text-xs text-gray-500">
          {autoSaveStatus === 'saving' && '● Guardando borrador...'}
          {autoSaveStatus === 'saved' && autoSavedAt && (
            `✓ Borrador guardado hace ${Math.max(0, Math.floor((Date.now() - autoSavedAt.getTime()) / 1000))} segundos`
          )}
          {autoSaveStatus === 'error' && `⚠ Error al guardar borrador${autoSaveError ? `: ${autoSaveError}` : ''}`}
        </div>
      )}

      {/* Datos básicos */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Datos de la rutina</h3>
          <div
            className="inline-flex w-full rounded-lg border border-gray-200 bg-gray-50 p-1 sm:w-auto"
            role="group"
            aria-label="Vista del editor"
          >
            <button
              type="button"
              onClick={() => handleEditorViewChange('detailed')}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none ${
                editorView === 'detailed'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-pressed={editorView === 'detailed'}
            >
              Detallada
            </button>
            <button
              type="button"
              onClick={() => handleEditorViewChange('compact')}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none ${
                editorView === 'compact'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-pressed={editorView === 'compact'}
            >
              Compacta
            </button>
          </div>
        </div>
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
          {!hasRoutineName && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Completá el nombre de la rutina para habilitar bloques y ejercicios. Así el borrador puede guardarse automáticamente.
            </div>
          )}

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
                      disabled={!hasRoutineName}
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
                <div className={editorView === 'compact' ? 'p-2 space-y-2' : 'p-4 space-y-4'}>
                {day.blocks.map((block, blockIndex) => {
                  const blockColor = getBlockColor(block.block_letter)

                  return (
                  <div key={block.id} className={`border ${blockColor.border} ${blockColor.bg} rounded-lg`}>
                    <div className={`flex items-center justify-between rounded-t-lg px-3 ${editorView === 'compact' ? 'py-1.5' : 'py-2'}`}>
                      <span className="font-medium text-gray-700">Bloque {block.block_letter}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!hasRoutineName}
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
                    <div className={editorView === 'compact' ? 'px-2 pb-2 space-y-1' : 'p-3 space-y-3'}>
                      {block.exercises.length === 0 ? (
                        <p className={`text-gray-400 text-sm text-center ${editorView === 'compact' ? 'py-1.5' : 'py-2'}`}>
                          {hasRoutineName
                            ? editorView === 'compact' ? 'Sin ejercicios' : 'Sin ejercicios. Agregá uno con el botón + Ejercicio.'
                            : 'Sin ejercicios. Primero completá el nombre de la rutina.'}
                        </p>
                      ) : editorView === 'compact' ? (
                        <div className="space-y-1">
                          {block.exercises.map((exercise, exerciseIndex) => (
                            <div
                              key={exercise.id}
                              className="flex min-h-8 items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
                            >
                              <span className="w-8 shrink-0 text-xs font-semibold text-gray-500">
                                {block.block_letter}{exercise.position}
                              </span>
                              <span className="flex min-w-0 flex-1 items-center gap-2">
                                <span className="min-w-0 truncate font-medium text-gray-900">
                                  {exercise.exercise?.name || 'Ejercicio'}
                                </span>
                                {exercise.exercise?.movement_pattern && (
                                  <span className="max-w-36 shrink-0 truncate rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                                    {exercise.exercise.movement_pattern.name}
                                  </span>
                                )}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 shrink-0 px-2 py-0 text-red-600"
                                onClick={() => removeExercise(dayIndex, blockIndex, exerciseIndex)}
                                aria-label={`Eliminar ${exercise.exercise?.name || 'ejercicio'}`}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
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
                                  <h4 className="flex flex-wrap items-center gap-2 font-medium text-gray-900">
                                    <span>{exercise.exercise?.name || 'Ejercicio'}</span>
                                    {exercise.exercise?.movement_pattern && (
                                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                                        {exercise.exercise.movement_pattern.name}
                                      </span>
                                    )}
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

                              <div className="mb-3 space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="inline-flex overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-1">
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
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs"
                                    onClick={() => toggleProgression(exercise.id)}
                                    disabled={!exercise.weeks.some(week => !isWeekEmpty(week))}
                                  >
                                    {expandedProgressionIds.has(exercise.id) ? 'Ocultar progresión' : 'Ver progresión'}
                                  </Button>
                                </div>

                                {expandedProgressionIds.has(exercise.id) && (
                                  <ExerciseProgressionPanel
                                    exercise={exercise}
                                    onClose={() => toggleProgression(exercise.id)}
                                  />
                                )}
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
                                      className="text-xs"
                                      disabled={selectedWeekSets.length <= 1}
                                      onClick={() => equalizeWeekSets(dayIndex, blockIndex, exerciseIndex, selectedWeekIndex)}
                                    >
                                      Igualar todas
                                    </Button>
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
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="px-2 text-xs"
                                      disabled={setIndex === 0}
                                      onClick={() => copySetFromPrevious(dayIndex, blockIndex, exerciseIndex, selectedWeekIndex, setIndex)}
                                      aria-label={`Copiar valores de serie ${setIndex}`}
                                      title="Copiar de serie anterior"
                                    >
                                      ↑
                                    </Button>
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
                  {editorView === 'detailed' && (
                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={!hasRoutineName}
                        onClick={() => addBlock(dayIndex)}
                      >
                        + Agregar bloque
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            )
          })}

          <Button variant="secondary" onClick={addDay} disabled={!hasRoutineName} className="w-full">
            + Agregar día
          </Button>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <Button variant="secondary" onClick={handleCancel} disabled={loading}>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select
              label="Patrón de movimiento"
              value={exercisePatternFilter}
              onChange={(e) => setExercisePatternFilter(e.target.value)}
              options={patterns.map(pattern => ({ value: pattern.id, label: pattern.name }))}
              placeholder="Todos"
            />
            <Select
              label="Dirección"
              value={exerciseDirectionFilter}
              onChange={(e) => setExerciseDirectionFilter(e.target.value)}
              options={directions.map(direction => ({ value: direction.id, label: direction.name }))}
              placeholder="Todas"
            />
            <Select
              label="Tipo de cadena"
              value={exerciseChainFilter}
              onChange={(e) => setExerciseChainFilter(e.target.value as ChainType | '')}
              options={[
                { value: 'abierta', label: 'Abierta' },
                { value: 'cerrada', label: 'Cerrada' },
              ]}
              placeholder="Todas"
            />
          </div>

          <Input
            value={exerciseSearch}
            onChange={(e) => setExerciseSearch(e.target.value)}
            placeholder="Buscar ejercicio..."
          />

          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-gray-500">
              {filteredExercises.length} de {exercises.length} ejercicios
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={clearExerciseFilters}
              disabled={!hasExerciseFilters}
            >
              Limpiar filtros
            </Button>
          </div>

          {selectedStudentId && exerciseHistoryLoading && (
            <p className="text-sm text-gray-500">Cargando historial del alumno...</p>
          )}
          {exerciseHistoryError && (
            <p className="text-sm text-red-600">{exerciseHistoryError}</p>
          )}

          <div className="max-h-96 overflow-y-auto space-y-1">
            {exercisesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              </div>
            ) : filteredExercises.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No se encontraron ejercicios</p>
            ) : (
              filteredExercises.map(exercise => {
                const lastExecution = exerciseHistory[exercise.id]

                return (
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
                    {lastExecution && (
                      <span className="mt-1 block text-xs leading-5 text-gray-500">
                        <span className="block">
                          Última vez: Semana {lastExecution.week_number} — {lastExecution.routine_name} — {new Date(lastExecution.completed_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="block">Prescripto: {lastExecution.prescribed}</span>
                        <span className="block">Registrado: {lastExecution.registered}</span>
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

interface ExerciseProgressionPanelProps {
  exercise: FormExercise
  onClose: () => void
}

function ExerciseProgressionPanel({ exercise, onClose }: ExerciseProgressionPanelProps) {
  const weeksWithData = exercise.weeks.filter(week => !isWeekEmpty(week))

  if (weeksWithData.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
        No hay semanas con datos cargados.
      </div>
    )
  }

  const weekSummaries = weeksWithData.map(week => {
    const firstSet = week.sets[0]
    const allSetsEqual = Boolean(firstSet) && week.sets.every(set => areSetsEqual(set, firstSet))

    return {
      week,
      allSetsEqual,
      compactLabel: firstSet ? `${week.sets.length}×${formatSet(firstSet)}` : '—',
    }
  })

  const allWeeksCompact = weekSummaries.every(summary => summary.allSetsEqual)
  const maxSetCount = Math.max(...weekSummaries.map(summary => summary.week.sets.length))
  const rowCount = allWeeksCompact ? 1 : maxSetCount

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h5 className="text-sm font-semibold text-gray-800">Progresión completa</h5>
        <Button type="button" size="sm" variant="ghost" className="text-xs" onClick={onClose}>
          Cerrar
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="w-24 px-2 py-1 font-medium">{allWeeksCompact ? 'Resumen' : 'Serie'}</th>
              {weekSummaries.map(({ week }) => (
                <th key={week.week_number} className="min-w-32 px-2 py-1 font-medium">
                  Sem {week.week_number}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }, (_, rowIndex) => (
              <tr key={rowIndex} className="border-t border-gray-200">
                <td className="px-2 py-2 text-xs font-medium text-gray-500">
                  {allWeeksCompact ? 'Todas' : `Serie ${rowIndex + 1}`}
                </td>
                {weekSummaries.map(summary => {
                  const set = summary.week.sets[rowIndex]
                  const value = summary.allSetsEqual
                    ? rowIndex === 0 ? summary.compactLabel : '—'
                    : set ? formatSet(set) : '—'

                  return (
                    <td key={summary.week.week_number} className="px-2 py-2 text-gray-800">
                      {value}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Export del tipo para usar en las páginas
export type { FormData as RoutineFormData, FormDay, FormBlock, FormExercise, FormWeekSets, FormSet }
