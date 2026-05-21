import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { StudentPlan, StudentPlanHistory } from '../lib/types'

export interface StudentPlanFormData {
  plan_description: string
  current_price: string
  currency: string
  increase_frequency_months: string
  next_increase_date: string
}

const todayDate = () => new Date().toISOString().slice(0, 10)

export function useStudentPlan(studentId: string | undefined) {
  const [plan, setPlan] = useState<StudentPlan | null>(null)
  const [history, setHistory] = useState<StudentPlanHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(false)

  const fetchPlan = useCallback(async () => {
    if (!isMountedRef.current) return

    if (!studentId) {
      setPlan(null)
      setHistory([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const planQuery = supabase
        .from('student_plans')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle()

      const historyQuery = supabase
        .from('student_plan_history')
        .select('*')
        .eq('student_id', studentId)
        .order('valid_from', { ascending: false })
        .order('created_at', { ascending: false })

      const [planResult, historyResult] = await Promise.all([planQuery, historyQuery])

      if (planResult.error) throw planResult.error
      if (historyResult.error) throw historyResult.error
      if (!isMountedRef.current) return

      setPlan((planResult.data || null) as StudentPlan | null)
      setHistory((historyResult.data || []) as StudentPlanHistory[])
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error ? err.message : 'Error al cargar plan comercial')
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [studentId])

  useEffect(() => {
    isMountedRef.current = true
    fetchPlan()
    return () => {
      isMountedRef.current = false
    }
  }, [fetchPlan])

  const savePlan = async (data: StudentPlanFormData): Promise<{ data: StudentPlan | null; error: string | null }> => {
    if (!studentId) {
      return { data: null, error: 'Alumno no encontrado' }
    }

    const description = data.plan_description.trim()
    const currency = data.currency.trim().toUpperCase() || 'ARS'
    const price = data.current_price.trim() ? Number(data.current_price) : NaN
    const frequency = data.increase_frequency_months ? Number(data.increase_frequency_months) : null

    if (!description) {
      return { data: null, error: 'La descripción del plan es obligatoria' }
    }

    if (!Number.isFinite(price) || price < 0) {
      return { data: null, error: 'El precio debe ser un número mayor o igual a 0' }
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      return { data: null, error: 'La moneda debe tener 3 letras, por ejemplo ARS' }
    }

    if (frequency !== null && ![1, 2, 3, 4, 6].includes(frequency)) {
      return { data: null, error: 'La frecuencia de aumento no es válida' }
    }

    const nextIncreaseDate = data.next_increase_date || null
    const priceChanged = !plan ||
      plan.plan_description !== description ||
      Number(plan.current_price) !== price ||
      plan.currency !== currency
    const nextIncreaseDateChanged = plan?.next_increase_date !== nextIncreaseDate

    try {
      if (priceChanged) {
        const { error: closeHistoryError } = await supabase
          .from('student_plan_history')
          .update({ valid_to: todayDate() })
          .eq('student_id', studentId)
          .is('valid_to', null)

        if (closeHistoryError) throw closeHistoryError
      }

      const { data: savedPlan, error: planError } = await supabase
        .from('student_plans')
        .upsert(
          {
            student_id: studentId,
            plan_description: description,
            current_price: price,
            currency,
            increase_frequency_months: frequency,
            next_increase_date: nextIncreaseDate,
            reminder_sent: nextIncreaseDateChanged ? false : plan?.reminder_sent ?? false,
          },
          { onConflict: 'student_id' }
        )
        .select('*')
        .single()

      if (planError) throw planError

      if (priceChanged) {
        const { error: historyError } = await supabase
          .from('student_plan_history')
          .insert({
            student_id: studentId,
            plan_description: description,
            price,
            currency,
            valid_from: todayDate(),
            valid_to: null,
          })

        if (historyError) throw historyError
      }

      await fetchPlan()
      return { data: savedPlan as StudentPlan, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Error al guardar plan comercial' }
    }
  }

  return {
    plan,
    history,
    loading,
    error,
    refetch: fetchPlan,
    savePlan,
  }
}
