import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Student } from '../../lib/types'

interface UpcomingIncreaseRow {
  student_id: string
  student_name: string
  plan_description: string
  current_price: number
  currency: string
  last_increase_date: string | null
  next_increase_date: string
  days_until: number
}

interface StudentPlanQueryResult {
  student_id: string
  plan_description: string
  current_price: number
  currency: string
  next_increase_date: string
  student: Student | Student[] | null
}

interface StudentPlanHistoryQueryResult {
  student_id: string
  valid_from: string
}

const getStudentName = (student: Student) => {
  return student.full_name || student.name || student.email || 'Alumno sin nombre'
}

const formatFullDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const toDateOnly = (date: Date) => date.toISOString().slice(0, 10)

const parseDateOnly = (dateString: string) => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const getDaysUntil = (dateString: string) => {
  const today = new Date()
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const targetDate = parseDateOnly(dateString)
  const diffMs = targetDate.getTime() - todayMidnight.getTime()

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

const formatPrice = (price: number, currency: string) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(price)
}

export function UpcomingIncreasesReport() {
  const [upcomingIncreases, setUpcomingIncreases] = useState<UpcomingIncreaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchUpcomingIncreases = async () => {
      setLoading(true)
      setError(null)

      try {
        const today = new Date()
        const toDate = new Date(today)
        toDate.setDate(toDate.getDate() + 30)

        const { data: plansData, error: plansError } = await supabase
          .from('student_plans')
          .select(`
            student_id,
            plan_description,
            current_price,
            currency,
            next_increase_date,
            student:profiles(*)
          `)
          .gte('next_increase_date', toDateOnly(today))
          .lte('next_increase_date', toDateOnly(toDate))
          .order('next_increase_date', { ascending: true })

        if (plansError) throw plansError
        if (!isMounted) return

        const plans = ((plansData || []) as unknown as StudentPlanQueryResult[])
          .filter(plan => Boolean(plan.next_increase_date))

        if (plans.length === 0) {
          setUpcomingIncreases([])
          return
        }

        const studentIds = plans.map(plan => plan.student_id)
        const { data: historyData, error: historyError } = await supabase
          .from('student_plan_history')
          .select('student_id, valid_from')
          .in('student_id', studentIds)
          .order('valid_from', { ascending: false })
          .order('created_at', { ascending: false })

        if (historyError) throw historyError
        if (!isMounted) return

        const latestHistoryByStudentId = new Map<string, string>()
        ;((historyData || []) as StudentPlanHistoryQueryResult[]).forEach(historyItem => {
          if (!latestHistoryByStudentId.has(historyItem.student_id)) {
            latestHistoryByStudentId.set(historyItem.student_id, historyItem.valid_from)
          }
        })

        setUpcomingIncreases(plans.map(plan => {
          const student = Array.isArray(plan.student)
            ? plan.student[0] || null
            : plan.student

          return {
            student_id: plan.student_id,
            student_name: student ? getStudentName(student) : 'Alumno sin nombre',
            plan_description: plan.plan_description,
            current_price: plan.current_price,
            currency: plan.currency,
            last_increase_date: latestHistoryByStudentId.get(plan.student_id) || null,
            next_increase_date: plan.next_increase_date,
            days_until: getDaysUntil(plan.next_increase_date),
          }
        }))
      } catch (err) {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Error al cargar aumentos próximos')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchUpcomingIncreases()

    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Aumentos próximos</h2>
        <p className="text-sm text-gray-500">
          Alumnos con aumento programado dentro de los próximos 30 días.
        </p>
      </div>

      {upcomingIncreases.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
          No hay aumentos programados para los próximos 30 días.
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Alumno</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Precio actual</th>
                <th className="px-4 py-3 font-medium">Último aumento</th>
                <th className="px-4 py-3 font-medium">Próximo aumento</th>
                <th className="px-4 py-3 font-medium">Faltan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {upcomingIncreases.map(increase => (
                <tr key={increase.student_id} className="bg-white">
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/students/${increase.student_id}`}
                      className="font-medium text-gray-900 hover:text-blue-700 hover:underline"
                    >
                      {increase.student_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{increase.plan_description}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {formatPrice(increase.current_price, increase.currency)}
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {increase.last_increase_date ? formatFullDate(increase.last_increase_date) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {formatFullDate(increase.next_increase_date)}
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {increase.days_until === 0
                      ? 'hoy'
                      : `${increase.days_until} día${increase.days_until === 1 ? '' : 's'}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
