import { useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { ExerciseList } from '../components/exercises/ExerciseList'
import { ExerciseForm } from '../components/exercises/ExerciseForm'
import { ExerciseDetail } from '../components/exercises/ExerciseDetail'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useExercises } from '../hooks/useExercises'
import { useAuth } from '../context/AuthContext'
import type { ExerciseWithRelations, ExerciseFormData } from '../lib/types'

export function Exercises() {
  const { exercises, loading, createExercise, updateExercise, deleteExercise } = useExercises()
  const { isAdmin } = useAuth()

  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithRelations | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSelect = (exercise: ExerciseWithRelations) => {
    setSelectedExercise(exercise)
    setIsDetailOpen(true)
  }

  const handleCreate = () => {
    setSelectedExercise(null)
    setIsEditing(false)
    setError('')
    setIsFormOpen(true)
  }

  const handleEdit = () => {
    setIsDetailOpen(false)
    setIsEditing(true)
    setError('')
    setIsFormOpen(true)
  }

  const handleSubmit = async (data: ExerciseFormData) => {
    setSaving(true)
    setError('')

    const { error } = isEditing && selectedExercise
      ? await updateExercise(selectedExercise.id, data)
      : await createExercise(data)

    if (error) {
      setError(error)
      setSaving(false)
    } else {
      setIsFormOpen(false)
      setSaving(false)
      setSelectedExercise(null)
    }
  }

  const handleDeleteConfirm = () => {
    setIsDetailOpen(false)
    setDeleteConfirm(true)
  }

  const handleDelete = async () => {
    if (!selectedExercise) return

    setDeleting(true)
    const { error } = await deleteExercise(selectedExercise.id)

    if (error) {
      alert(error)
    }

    setDeleting(false)
    setDeleteConfirm(false)
    setSelectedExercise(null)
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ejercicios</h1>
            <p className="text-gray-600">Biblioteca de ejercicios de musculación</p>
          </div>
          {isAdmin && (
            <Button onClick={handleCreate}>
              + Nuevo ejercicio
            </Button>
          )}
        </div>

        <ExerciseList
          exercises={exercises}
          onSelect={handleSelect}
          loading={loading}
        />
      </div>

      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedExercise?.name || ''}
        size="lg"
      >
        {selectedExercise && (
          <ExerciseDetail
            exercise={selectedExercise}
            onEdit={handleEdit}
            onDelete={handleDeleteConfirm}
            onClose={() => setIsDetailOpen(false)}
          />
        )}
      </Modal>

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={isEditing ? 'Editar ejercicio' : 'Nuevo ejercicio'}
        size="xl"
      >
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        <ExerciseForm
          exercise={isEditing ? selectedExercise : null}
          onSubmit={handleSubmit}
          onCancel={() => setIsFormOpen(false)}
          loading={saving}
        />
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Eliminar ejercicio"
        message={`¿Estás seguro de eliminar "${selectedExercise?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        loading={deleting}
      />
    </Layout>
  )
}
