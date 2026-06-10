import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { TextArea } from '../ui/TextArea'
import { Modal } from '../ui/Modal'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useStudents } from '../../hooks/useStudents'
import { useInvitations } from '../../hooks/useInvitations'
import { useAuth } from '../../context/AuthContext'
import type { Invitation, Student } from '../../lib/types'

export function StudentManager() {
  const { students, loading, createStudent, addSelfAsStudent, enableStudent, disableStudent } = useStudents()
  const { createInvitation } = useInvitations()
  const { user, profile, refreshProfile } = useAuth()

  const [actionStudent, setActionStudent] = useState<Student | null>(null)
  const [actionType, setActionType] = useState<'enable' | 'disable' | null>(null)
  const [processing, setProcessing] = useState(false)
  const [isNewStudentOpen, setIsNewStudentOpen] = useState(false)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [studentForm, setStudentForm] = useState({
    full_name: '',
    email: '',
    birth_date: '',
    height_cm: '',
    weight_kg: '',
    goal: '',
  })
  const [inviteForm, setInviteForm] = useState({
    full_name: '',
    email: '',
  })
  const [createdInvitation, setCreatedInvitation] = useState<Invitation | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [addingSelf, setAddingSelf] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')

  const isSelfAlreadyStudent = Boolean(
    user?.id && students.some(student => student.id === user.id)
  )
  const canAddSelfAsStudent = Boolean(
    user?.id &&
    profile?.role === 'admin' &&
    !isSelfAlreadyStudent
  )
  const normalizedStudentSearch = studentSearch.trim().toLowerCase()
  const filteredStudents = normalizedStudentSearch
    ? students.filter(student => {
        const searchableText = [
          student.full_name,
          student.name,
          student.email,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return searchableText.includes(normalizedStudentSearch)
      })
    : students

  const handleAction = (student: Student, type: 'enable' | 'disable') => {
    setActionStudent(student)
    setActionType(type)
  }

  const confirmAction = async () => {
    if (!actionStudent || !actionType || !user) return

    setProcessing(true)

    const { error } = actionType === 'enable'
      ? await enableStudent(actionStudent.id)
      : await disableStudent(actionStudent.id, user.id)

    if (error) {
      alert(error)
    }

    setProcessing(false)
    setActionStudent(null)
    setActionType(null)
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getInvitationLink = (token: string) => {
    return `${window.location.origin}/register?token=${token}`
  }

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getInvitationLink(token))
    alert('Link copiado al portapapeles')
  }

  const getInvitationEmailHref = (invitation: Invitation) => {
    const link = getInvitationLink(invitation.token)
    const subject = encodeURIComponent('Invitación a XIM App')
    const body = encodeURIComponent(
      `Hola,\n\nTe invito a crear tu cuenta en XIM App desde este link:\n\n${link}\n\nSi no esperabas esta invitación, podés ignorar este correo.`
    )

    return `mailto:${invitation.email}?subject=${subject}&body=${body}`
  }

  const getAccountStatus = (student: Student) => {
    if (student.account_status) return student.account_status
    return student.active === false ? 'disabled' : 'active'
  }

  const getStatusBadge = (student: Student) => {
    const status = getAccountStatus(student)

    if (status === 'pending') {
      return (
        <span className="inline-flex items-center rounded bg-yellow-100 px-1.5 py-0 text-[10px] font-medium leading-4 text-yellow-800 sm:px-2 sm:py-0.5 sm:text-xs">
          Pendiente
        </span>
      )
    }

    if (status === 'disabled') {
      return (
        <span className="inline-flex items-center rounded bg-red-100 px-1.5 py-0 text-[10px] font-medium leading-4 text-red-800 sm:px-2 sm:py-0.5 sm:text-xs">
          Inhabilitado
        </span>
      )
    }

    return (
      <span className="inline-flex items-center rounded bg-green-100 px-1.5 py-0 text-[10px] font-medium leading-4 text-green-800 sm:px-2 sm:py-0.5 sm:text-xs">
        Activo
      </span>
    )
  }

  const closeNewStudentModal = () => {
    setIsNewStudentOpen(false)
    setStudentForm({
      full_name: '',
      email: '',
      birth_date: '',
      height_cm: '',
      weight_kg: '',
      goal: '',
    })
    setFormError('')
  }

  const closeInviteModal = () => {
    setIsInviteOpen(false)
    setInviteForm({ full_name: '', email: '' })
    setCreatedInvitation(null)
    setFormError('')
  }

  const handleCreateStudent = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return

    setSaving(true)
    setFormError('')

    const { error } = await createStudent({
      ...studentForm,
      created_by_admin: user.id,
    })

    if (error) {
      setFormError(error)
    } else {
      closeNewStudentModal()
    }

    setSaving(false)
  }

  const handleCreateDirectInvitation = async (event: React.FormEvent) => {
    event.preventDefault()

    setSaving(true)
    setFormError('')

    const { invitation, error } = await createInvitation(
      inviteForm.email.trim(),
      'consulta',
      inviteForm.full_name.trim()
    )

    if (error) {
      setFormError(error)
    } else {
      setCreatedInvitation(invitation)
      setInviteForm({ full_name: '', email: '' })
    }

    setSaving(false)
  }

  const handleAddSelfAsStudent = async () => {
    if (!user) return

    setAddingSelf(true)
    const { error } = await addSelfAsStudent(user.id)

    if (error) {
      alert(error)
    } else {
      await refreshProfile()
    }

    setAddingSelf(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Alumnos</h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">{students.length} alumnos</span>
          {canAddSelfAsStudent && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAddSelfAsStudent}
              disabled={addingSelf}
            >
              {addingSelf ? 'Agregando...' : 'Agregarme como alumna'}
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => setIsInviteOpen(true)}>
            Invitar alumno
          </Button>
          <Button size="sm" onClick={() => setIsNewStudentOpen(true)}>
            Nuevo alumno
          </Button>
        </div>
      </div>

      {students.length > 0 && (
        <div className="mb-3">
          <Input
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Buscar alumno…"
          />
        </div>
      )}

      {students.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">
          No hay alumnos registrados. Creá un alumno o enviá una invitación para empezar.
        </p>
      ) : filteredStudents.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">
          No se encontraron alumnos
        </p>
      ) : (
        <div className="space-y-2">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className={`flex items-start justify-between gap-3 rounded-lg border p-3 sm:items-center sm:p-4 ${
                getAccountStatus(student) !== 'disabled'
                  ? 'bg-white border-gray-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="min-w-0 break-words text-sm font-medium leading-5 text-gray-900 sm:text-base">
                    {student.full_name || student.name || student.email || 'Alumno sin nombre'}
                  </span>
                  {student.id === user?.id && (
                    <span className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0 text-[10px] font-medium leading-4 text-blue-800 sm:px-2 sm:py-0.5 sm:text-xs">
                      Vos · Entrenadora
                    </span>
                  )}
                  {getStatusBadge(student)}
                </div>
                <div className="mt-0.5 text-xs leading-5 text-gray-500 sm:mt-1 sm:text-sm">
                  {(student.full_name || student.name) && student.email && <span className="mr-1 sm:mr-2">{student.email} ·</span>}
                  {getAccountStatus(student) === 'pending' ? 'Creado' : 'Registrado'}: {formatDate(student.created_at)}
                  {getAccountStatus(student) === 'disabled' && student.disabled_at && (
                    <span className="ml-1 sm:ml-2">
                      · Inhabilitado: {formatDate(student.disabled_at)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-start gap-1.5 sm:ml-4 sm:gap-2">
                <Link to={`/admin/students/${student.id}`}>
                  <Button size="sm" variant="ghost" className="min-h-11 w-full sm:min-h-0 sm:w-auto">
                    Ver
                  </Button>
                </Link>
                {getAccountStatus(student) === 'disabled' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="min-h-11 sm:min-h-0"
                    onClick={() => handleAction(student, 'enable')}
                  >
                    Habilitar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-h-11 text-red-600 hover:text-red-700 hover:bg-red-50 sm:min-h-0"
                    onClick={() => handleAction(student, 'disable')}
                  >
                    Inhabilitar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isNewStudentOpen}
        onClose={closeNewStudentModal}
        title="Nuevo alumno"
        size="md"
      >
        <form onSubmit={handleCreateStudent} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {formError}
            </div>
          )}
          <Input
            label="Nombre"
            value={studentForm.full_name}
            onChange={(e) => setStudentForm(prev => ({ ...prev, full_name: e.target.value }))}
            required
            placeholder="Nombre del alumno"
          />
          <Input
            label="Email (opcional)"
            type="email"
            value={studentForm.email}
            onChange={(e) => setStudentForm(prev => ({ ...prev, email: e.target.value }))}
            placeholder="usuario@email.com"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Fecha de nacimiento"
              type="date"
              value={studentForm.birth_date}
              onChange={(e) => setStudentForm(prev => ({ ...prev, birth_date: e.target.value }))}
            />
            <Input
              label="Altura (cm)"
              type="number"
              step="0.1"
              min="0"
              value={studentForm.height_cm}
              onChange={(e) => setStudentForm(prev => ({ ...prev, height_cm: e.target.value }))}
              placeholder="Ej: 165.5"
            />
            <Input
              label="Peso (kg)"
              type="number"
              step="0.01"
              min="0"
              value={studentForm.weight_kg}
              onChange={(e) => setStudentForm(prev => ({ ...prev, weight_kg: e.target.value }))}
              placeholder="Ej: 68.50"
            />
          </div>
          <TextArea
            label="Objetivo"
            value={studentForm.goal}
            onChange={(e) => setStudentForm(prev => ({ ...prev, goal: e.target.value }))}
            rows={3}
            placeholder="Objetivo del alumno"
          />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={closeNewStudentModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !studentForm.full_name.trim()}>
              {saving ? 'Creando...' : 'Crear alumno'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isInviteOpen}
        onClose={closeInviteModal}
        title="Invitar alumno"
        size="sm"
      >
        {createdInvitation ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded text-sm">
              Invitación creada. Enviá el link al alumno por email.
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link de invitación
              </label>
              <div className="break-all rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {getInvitationLink(createdInvitation.token)}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="secondary" onClick={() => copyLink(createdInvitation.token)}>
                Copiar link
              </Button>
              <Button
                type="button"
                onClick={() => {
                  window.location.href = getInvitationEmailHref(createdInvitation)
                }}
              >
                Abrir email
              </Button>
              <Button type="button" variant="ghost" onClick={closeInviteModal}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateDirectInvitation} className="space-y-4">
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                {formError}
              </div>
            )}
            <Input
              label="Nombre"
              value={inviteForm.full_name}
              onChange={(e) => setInviteForm(prev => ({ ...prev, full_name: e.target.value }))}
              required
              placeholder="Nombre del alumno"
            />
            <Input
              label="Email"
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
              required
              placeholder="usuario@email.com"
            />
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="secondary" onClick={closeInviteModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !inviteForm.full_name.trim() || !inviteForm.email.trim()}>
                {saving ? 'Creando...' : 'Crear invitación'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!actionStudent && !!actionType}
        onClose={() => {
          setActionStudent(null)
          setActionType(null)
        }}
        onConfirm={confirmAction}
        title={actionType === 'enable' ? 'Habilitar alumno' : 'Inhabilitar alumno'}
        message={
          actionType === 'enable'
            ? `¿Estás segura de habilitar a "${actionStudent?.full_name || actionStudent?.name || actionStudent?.email || 'este alumno'}"? Podrá volver a acceder a la aplicación.`
            : `¿Estás segura de inhabilitar a "${actionStudent?.full_name || actionStudent?.name || actionStudent?.email || 'este alumno'}"? No podrá acceder a la aplicación hasta que lo vuelvas a habilitar.`
        }
        confirmText={actionType === 'enable' ? 'Habilitar' : 'Inhabilitar'}
        loading={processing}
      />
    </div>
  )
}
