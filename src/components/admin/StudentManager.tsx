import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useStudents } from '../../hooks/useStudents'
import { useAuth } from '../../context/AuthContext'
import type { Student } from '../../lib/types'

export function StudentManager() {
  const { students, loading, enableStudent, disableStudent } = useStudents()
  const { user } = useAuth()

  const [actionStudent, setActionStudent] = useState<Student | null>(null)
  const [actionType, setActionType] = useState<'enable' | 'disable' | null>(null)
  const [processing, setProcessing] = useState(false)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Alumnos</h3>
        <span className="text-sm text-gray-500">{students.length} alumnos</span>
      </div>

      {students.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">
          No hay alumnos registrados. Enviá una invitación para agregar alumnos.
        </p>
      ) : (
        <div className="space-y-2">
          {students.map((student) => (
            <div
              key={student.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                student.active !== false
                  ? 'bg-white border-gray-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 font-medium truncate">
                    {student.full_name || student.name || student.email}
                  </span>
                  {student.active === false ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      Inhabilitado
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Activo
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {(student.full_name || student.name) && <span className="mr-2">{student.email} ·</span>}
                  Registrado: {formatDate(student.created_at)}
                  {student.active === false && student.disabled_at && (
                    <span className="ml-2">
                      · Inhabilitado: {formatDate(student.disabled_at)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <Link to={`/admin/students/${student.id}`}>
                  <Button size="sm" variant="ghost">
                    Ver
                  </Button>
                </Link>
                {student.active === false ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleAction(student, 'enable')}
                  >
                    Habilitar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
            ? `¿Estás segura de habilitar a "${actionStudent?.full_name || actionStudent?.name || actionStudent?.email}"? Podrá volver a acceder a la aplicación.`
            : `¿Estás segura de inhabilitar a "${actionStudent?.full_name || actionStudent?.name || actionStudent?.email}"? No podrá acceder a la aplicación hasta que lo vuelvas a habilitar.`
        }
        confirmText={actionType === 'enable' ? 'Habilitar' : 'Inhabilitar'}
        loading={processing}
      />
    </div>
  )
}
