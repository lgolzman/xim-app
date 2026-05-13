import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { StudentProgress } from '../../components/admin/StudentProgress'
import { supabase } from '../../lib/supabase'
import { useRoutines } from '../../hooks/useRoutines'
import { useStudents } from '../../hooks/useStudents'
import { useAuth } from '../../context/AuthContext'
import type { Student, RoutineStatus } from '../../lib/types'

export function StudentDetail() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { enableStudent, disableStudent } = useStudents()
  const { routines, loading: routinesLoading, updateRoutineStatus, deleteRoutine } = useRoutines(studentId)

  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [actionType, setActionType] = useState<'enable' | 'disable' | 'activate' | 'archive' | 'delete' | null>(null)
  const [actionRoutineId, setActionRoutineId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

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
        setStudent(data as Student)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar alumno')
      } finally {
        setLoading(false)
      }
    }

    fetchStudent()
  }, [studentId])

  const handleStudentAction = (type: 'enable' | 'disable') => {
    setActionType(type)
    setActionRoutineId(null)
  }

  const handleRoutineAction = (routineId: string, type: 'activate' | 'archive' | 'delete') => {
    setActionType(type)
    setActionRoutineId(routineId)
  }

  const confirmAction = async () => {
    if (!student || !user) return

    setProcessing(true)

    try {
      if (actionType === 'enable') {
        await enableStudent(student.id)
        setStudent({ ...student, active: true, disabled_by: null, disabled_at: null })
      } else if (actionType === 'disable') {
        await disableStudent(student.id, user.id)
        setStudent({ ...student, active: false, disabled_by: user.id, disabled_at: new Date().toISOString() })
      } else if (actionType === 'activate' && actionRoutineId) {
        await updateRoutineStatus(actionRoutineId, 'active')
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

  const getActionMessage = () => {
    const studentName = student?.name || student?.email
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
          <Button variant="secondary" onClick={() => navigate('/admin')}>
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
              <Link to="/admin" className="hover:text-gray-700">Administración</Link>
              <span>/</span>
              <span>Alumno</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{student.name || student.email}</h1>
            {student.name && (
              <p className="text-sm text-gray-500">{student.email}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
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

        {/* Routines Section */}
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
          actionType === 'archive' ? 'Archivar rutina' :
          actionType === 'delete' ? 'Eliminar rutina' : ''
        }
        message={getActionMessage()}
        confirmText={
          actionType === 'enable' ? 'Habilitar' :
          actionType === 'disable' ? 'Inhabilitar' :
          actionType === 'activate' ? 'Activar' :
          actionType === 'archive' ? 'Archivar' :
          actionType === 'delete' ? 'Eliminar' : ''
        }
        loading={processing}
      />
    </Layout>
  )
}
