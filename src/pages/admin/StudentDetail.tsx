import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { TextArea } from '../../components/ui/TextArea'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { StudentProgress } from '../../components/admin/StudentProgress'
import { supabase } from '../../lib/supabase'
import { useRoutines } from '../../hooks/useRoutines'
import { useStudents } from '../../hooks/useStudents'
import { useStudentProfile } from '../../hooks/useStudentProfile'
import { useStudentPlan } from '../../hooks/useStudentPlan'
import { useAuth } from '../../context/AuthContext'
import type { Student, RoutineStatus } from '../../lib/types'

type StudentDetailTab = 'overview' | 'profile' | 'plan'

export function StudentDetail() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { enableStudent, disableStudent } = useStudents()
  const { notes, loadingNotes, updateStudentProfile, addStudentNote } = useStudentProfile(studentId)
  const { plan, history: planHistory, loading: planLoading, savePlan } = useStudentPlan(studentId)
  const { routines, loading: routinesLoading, updateRoutineStatus, reactivateArchivedRoutine, deleteRoutine } = useRoutines(studentId)

  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileForm, setProfileForm] = useState({
    birth_date: '',
    height_cm: '',
    weight_kg: '',
    goal: '',
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [newNote, setNewNote] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [planForm, setPlanForm] = useState({
    plan_description: '',
    current_price: '',
    currency: 'ARS',
    increase_frequency_months: '',
    next_increase_date: '',
  })
  const [planSaving, setPlanSaving] = useState(false)
  const [planMessage, setPlanMessage] = useState<string | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)

  const [actionType, setActionType] = useState<'enable' | 'disable' | 'activate' | 'reactivate' | 'archive' | 'delete' | null>(null)
  const [actionRoutineId, setActionRoutineId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [activeDetailTab, setActiveDetailTab] = useState<StudentDetailTab>('overview')

  const detailTabs: { id: StudentDetailTab; label: string }[] = [
    { id: 'overview', label: 'Principal' },
    { id: 'profile', label: 'Ficha del alumno' },
    { id: 'plan', label: 'Plan comercial' },
  ]

  useEffect(() => {
    const fetchStudent = async () => {
      if (!studentId) return

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', studentId)
          .single()

        if (error) throw error
        const loadedStudent = data as Student
        setStudent(loadedStudent)
        setProfileForm({
          birth_date: loadedStudent.birth_date || '',
          height_cm: loadedStudent.height_cm !== null && loadedStudent.height_cm !== undefined
            ? String(loadedStudent.height_cm)
            : '',
          weight_kg: loadedStudent.weight_kg !== null && loadedStudent.weight_kg !== undefined
            ? String(loadedStudent.weight_kg)
            : '',
          goal: loadedStudent.goal || '',
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar alumno')
      } finally {
        setLoading(false)
      }
    }

    fetchStudent()
  }, [studentId])

  useEffect(() => {
    if (!plan) {
      setPlanForm({
        plan_description: '',
        current_price: '',
        currency: 'ARS',
        increase_frequency_months: '',
        next_increase_date: '',
      })
      return
    }

    setPlanForm({
      plan_description: plan.plan_description,
      current_price: String(plan.current_price),
      currency: plan.currency,
      increase_frequency_months: plan.increase_frequency_months
        ? String(plan.increase_frequency_months)
        : '',
      next_increase_date: plan.next_increase_date || '',
    })
  }, [plan])

  const handleStudentAction = (type: 'enable' | 'disable') => {
    setActionType(type)
    setActionRoutineId(null)
  }

  const handleRoutineAction = (routineId: string, type: 'activate' | 'reactivate' | 'archive' | 'delete') => {
    setActionType(type)
    setActionRoutineId(routineId)
  }

  const handleProfileChange = (field: keyof typeof profileForm, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }))
    setProfileMessage(null)
    setProfileError(null)
  }

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    setProfileError(null)
    setProfileMessage(null)

    const { data, error } = await updateStudentProfile(profileForm)
    if (error) {
      setProfileError(error)
    } else if (data) {
      setStudent(data)
      setProfileMessage('Ficha guardada')
    }

    setProfileSaving(false)
  }

  const handleAddNote = async () => {
    if (!user) return

    setNoteSaving(true)
    setNoteError(null)

    const { error } = await addStudentNote(newNote, user.id)
    if (error) {
      setNoteError(error)
    } else {
      setNewNote('')
    }

    setNoteSaving(false)
  }

  const handlePlanChange = (field: keyof typeof planForm, value: string) => {
    setPlanForm(prev => ({ ...prev, [field]: value }))
    setPlanMessage(null)
    setPlanError(null)
  }

  const handleSavePlan = async () => {
    setPlanSaving(true)
    setPlanMessage(null)
    setPlanError(null)

    const { error } = await savePlan(planForm)
    if (error) {
      setPlanError(error)
    } else {
      setPlanMessage('Plan guardado')
    }

    setPlanSaving(false)
  }

  const confirmAction = async () => {
    if (!student || !user) return

    setProcessing(true)

    try {
      if (actionType === 'enable') {
        const { error } = await enableStudent(student.id)
        if (error) throw new Error(error)
        setStudent({ ...student, active: true, disabled_by: null, disabled_at: null })
      } else if (actionType === 'disable') {
        const { error } = await disableStudent(student.id, user.id)
        if (error) throw new Error(error)
        setStudent({ ...student, active: false, disabled_by: user.id, disabled_at: new Date().toISOString() })
      } else if (actionType === 'activate' && actionRoutineId) {
        await updateRoutineStatus(actionRoutineId, 'active')
      } else if (actionType === 'reactivate' && actionRoutineId) {
        const { error } = await reactivateArchivedRoutine(actionRoutineId, student.id)
        if (error) throw new Error(error)
      } else if (actionType === 'archive' && actionRoutineId) {
        await updateRoutineStatus(actionRoutineId, 'archived')
      } else if (actionType === 'delete' && actionRoutineId) {
        await deleteRoutine(actionRoutineId)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al realizar la acción')
    }

    setProcessing(false)
    setActionType(null)
    setActionRoutineId(null)
  }

  const getStatusBadge = (status: RoutineStatus) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Activa</span>
      case 'draft':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Borrador</span>
      case 'archived':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">Archivada</span>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatOptionalDate = (dateString: string | null) => {
    return dateString ? formatDate(dateString) : 'Actual'
  }

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(price)
  }

  const getActionMessage = () => {
    const studentName = student?.full_name || student?.name || student?.email
    if (actionType === 'enable') {
      return `¿Estás segura de habilitar a "${studentName}"?`
    }
    if (actionType === 'disable') {
      return `¿Estás segura de inhabilitar a "${studentName}"?`
    }
    const routine = routines.find(r => r.id === actionRoutineId)
    if (actionType === 'activate') {
      return `¿Activar la rutina "${routine?.name}"? Esto archivará cualquier otra rutina activa.`
    }
    if (actionType === 'reactivate') {
      const activeRoutine = routines.find(r => r.status === 'active')
      if (!activeRoutine) {
        return `¿Querés reactivar "${routine?.name}"?`
      }
      return `¿Querés reactivar "${routine?.name}"? La rutina activa actual pasará a estado borrador.`
    }
    if (actionType === 'archive') {
      return `¿Archivar la rutina "${routine?.name}"?`
    }
    if (actionType === 'delete') {
      return `¿Eliminar la rutina "${routine?.name}"? Esta acción no se puede deshacer.`
    }
    return ''
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    )
  }

  if (error || !student) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Alumno no encontrado'}</p>
          <Button variant="secondary" onClick={() => navigate('/admin/students')}>
            Volver
          </Button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link to="/admin/students" className="hover:text-gray-700">Alumnos</Link>
              <span>/</span>
              <span>Alumno</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {student.full_name || student.name || student.email}
            </h1>
            {(student.full_name || student.name) && (
              <p className="text-sm text-gray-500">{student.email}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link to={`/admin/students/${student.id}/register-workout`}>
              <Button variant="secondary">
                Registrar entrenamiento
              </Button>
            </Link>
            {student.active !== false ? (
              <Button
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleStudentAction('disable')}
              >
                Inhabilitar
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => handleStudentAction('enable')}>
                Habilitar
              </Button>
            )}
          </div>
        </div>

        {/* Student Info Card */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-1 overflow-x-auto">
            {detailTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveDetailTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeDetailTab === tab.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Student Profile Section */}
        {activeDetailTab === 'profile' && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Ficha del alumno</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Datos físicos y objetivo</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Fecha de nacimiento"
                  type="date"
                  value={profileForm.birth_date}
                  onChange={(e) => handleProfileChange('birth_date', e.target.value)}
                />
                <Input
                  label="Altura (cm)"
                  type="number"
                  step="0.1"
                  min="0"
                  value={profileForm.height_cm}
                  onChange={(e) => handleProfileChange('height_cm', e.target.value)}
                  placeholder="Ej: 165.5"
                />
                <Input
                  label="Peso (kg)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={profileForm.weight_kg}
                  onChange={(e) => handleProfileChange('weight_kg', e.target.value)}
                  placeholder="Ej: 68.50"
                />
              </div>
              <div className="mt-4">
                <TextArea
                  label="Objetivo"
                  value={profileForm.goal}
                  onChange={(e) => handleProfileChange('goal', e.target.value)}
                  placeholder="Ej: Ganar masa muscular, bajar de peso, mejorar resistencia..."
                  rows={3}
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={handleSaveProfile} disabled={profileSaving}>
                  {profileSaving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
                {profileMessage && (
                  <span className="text-sm text-green-700">{profileMessage}</span>
                )}
                {profileError && (
                  <span className="text-sm text-red-600">{profileError}</span>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Notas</h3>
              <div className="space-y-3">
                <TextArea
                  value={newNote}
                  onChange={(e) => {
                    setNewNote(e.target.value)
                    setNoteError(null)
                  }}
                  placeholder="Agregar una nota interna sobre el alumno..."
                  rows={3}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={handleAddNote}
                    disabled={noteSaving || !newNote.trim()}
                  >
                    {noteSaving ? 'Agregando...' : 'Agregar nota'}
                  </Button>
                  {noteError && (
                    <span className="text-sm text-red-600">{noteError}</span>
                  )}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {loadingNotes ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                  </div>
                ) : notes.length === 0 ? (
                  <p className="text-sm text-gray-500">Todavía no hay notas para este alumno.</p>
                ) : (
                  notes.map(note => (
                    <div key={note.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        {formatDateTime(note.created_at)}
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.note}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Commercial Plan Section */}
        {activeDetailTab === 'plan' && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Plan comercial</h2>
          </div>
          <div className="p-6 space-y-6">
            {planLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Plan actual</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Descripción del plan"
                      value={planForm.plan_description}
                      onChange={(e) => handlePlanChange('plan_description', e.target.value)}
                      placeholder="Ej: Presencial 2x semana"
                    />
                    <div className="grid grid-cols-[1fr_7rem] gap-3">
                      <Input
                        label="Precio mensual"
                        type="number"
                        step="0.01"
                        min="0"
                        value={planForm.current_price}
                        onChange={(e) => handlePlanChange('current_price', e.target.value)}
                        placeholder="Ej: 45000"
                      />
                      <Input
                        label="Moneda"
                        value={planForm.currency}
                        onChange={(e) => handlePlanChange('currency', e.target.value.toUpperCase())}
                      />
                    </div>
                    <Select
                      label="Actualización"
                      value={planForm.increase_frequency_months}
                      onChange={(e) => handlePlanChange('increase_frequency_months', e.target.value)}
                      placeholder="Sin frecuencia"
                      options={[
                        { value: '1', label: 'Cada 1 mes' },
                        { value: '2', label: 'Cada 2 meses' },
                        { value: '3', label: 'Cada 3 meses' },
                        { value: '4', label: 'Cada 4 meses' },
                        { value: '6', label: 'Cada 6 meses' },
                      ]}
                    />
                    <Input
                      label="Próxima fecha de aumento"
                      type="date"
                      value={planForm.next_increase_date}
                      onChange={(e) => handlePlanChange('next_increase_date', e.target.value)}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button onClick={handleSavePlan} disabled={planSaving}>
                      {planSaving ? 'Guardando...' : 'Guardar plan'}
                    </Button>
                    {planMessage && (
                      <span className="text-sm text-green-700">{planMessage}</span>
                    )}
                    {planError && (
                      <span className="text-sm text-red-600">{planError}</span>
                    )}
                  </div>
                  {plan?.next_increase_date && (
                    <p className="mt-3 text-sm text-gray-500">
                      Próximo aumento: {formatDate(plan.next_increase_date)}
                      {plan.reminder_sent && ' · Recordatorio enviado'}
                    </p>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Historial de precios</h3>
                  {planHistory.length === 0 ? (
                    <p className="text-sm text-gray-500">Todavía no hay historial de precios.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                          <tr>
                            <th className="px-4 py-3">Período</th>
                            <th className="px-4 py-3">Plan</th>
                            <th className="px-4 py-3">Precio</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {planHistory.map(historyItem => (
                            <tr key={historyItem.id}>
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                {formatDate(historyItem.valid_from)} → {formatOptionalDate(historyItem.valid_to)}
                              </td>
                              <td className="px-4 py-3 text-gray-900">
                                {historyItem.plan_description}
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                                {formatPrice(historyItem.price, historyItem.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        )}

        {/* Routines Section */}
        {activeDetailTab === 'overview' && (
        <>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gray-600">Estado:</span>
                {student.active !== false ? (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Activo</span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Inhabilitado</span>
                )}
              </div>
              <div className="text-sm text-gray-500">
                Registrado: {formatDate(student.created_at)}
                {student.disabled_at && (
                  <span className="ml-4">Inhabilitado: {formatDate(student.disabled_at)}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Rutinas</h2>
              <Link to={`/admin/routines/new?studentId=${studentId}`}>
                <Button size="sm">+ Nueva rutina</Button>
              </Link>
            </div>
          </div>

          <div className="p-6">
            {routinesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              </div>
            ) : routines.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Este alumno no tiene rutinas. Creá una nueva rutina para empezar.
              </p>
            ) : (
              <div className="space-y-3">
                {routines.map((routine) => (
                  <div
                    key={routine.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{routine.name}</span>
                        {getStatusBadge(routine.status)}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {routine.total_weeks} semanas · Creada: {formatDate(routine.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/routines/${routine.id}/view`}>
                        <Button variant="secondary" size="sm">
                          Ver rutina completa
                        </Button>
                      </Link>
                      <Link to={`/admin/routines/${routine.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          {routine.status === 'archived' ? 'Ver' : 'Editar'}
                        </Button>
                      </Link>
                      {routine.status === 'draft' && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRoutineAction(routine.id, 'activate')}
                          >
                            Activar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleRoutineAction(routine.id, 'delete')}
                          >
                            Eliminar
                          </Button>
                        </>
                      )}
                      {routine.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRoutineAction(routine.id, 'archive')}
                        >
                          Archivar
                        </Button>
                      )}
                      {routine.status === 'archived' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRoutineAction(routine.id, 'reactivate')}
                        >
                          Reactivar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Progress Section */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Progreso</h2>
          </div>
          <div className="p-6">
            <StudentProgress studentId={studentId!} />
          </div>
        </div>
        </>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!actionType}
        onClose={() => {
          setActionType(null)
          setActionRoutineId(null)
        }}
        onConfirm={confirmAction}
        title={
          actionType === 'enable' ? 'Habilitar alumno' :
          actionType === 'disable' ? 'Inhabilitar alumno' :
          actionType === 'activate' ? 'Activar rutina' :
          actionType === 'reactivate' ? 'Reactivar rutina' :
          actionType === 'archive' ? 'Archivar rutina' :
          actionType === 'delete' ? 'Eliminar rutina' : ''
        }
        message={getActionMessage()}
        confirmText={
          actionType === 'enable' ? 'Habilitar' :
          actionType === 'disable' ? 'Inhabilitar' :
          actionType === 'activate' ? 'Activar' :
          actionType === 'reactivate' ? 'Reactivar' :
          actionType === 'archive' ? 'Archivar' :
          actionType === 'delete' ? 'Eliminar' : ''
        }
        loading={processing}
      />
    </Layout>
  )
}
