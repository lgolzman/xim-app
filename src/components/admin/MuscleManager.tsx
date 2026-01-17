import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useMuscles } from '../../hooks/useMuscles'
import type { Muscle } from '../../lib/types'

export function MuscleManager() {
  const { muscles, loading, createMuscle, updateMuscle, deleteMuscle } = useMuscles()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMuscle, setEditingMuscle] = useState<Muscle | null>(null)
  const [muscleName, setMuscleName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState<Muscle | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filteredMuscles = muscles.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => {
    setEditingMuscle(null)
    setMuscleName('')
    setError('')
    setIsModalOpen(true)
  }

  const openEdit = (muscle: Muscle) => {
    setEditingMuscle(muscle)
    setMuscleName(muscle.name)
    setError('')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!muscleName.trim()) return

    setSaving(true)
    setError('')

    const { error } = editingMuscle
      ? await updateMuscle(editingMuscle.id, muscleName.trim())
      : await createMuscle(muscleName.trim())

    if (error) {
      setError(error)
      setSaving(false)
    } else {
      setIsModalOpen(false)
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return

    setDeleting(true)
    const { error } = await deleteMuscle(deleteConfirm.id)

    if (error) {
      alert(error)
    }

    setDeleting(false)
    setDeleteConfirm(null)
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
        <h3 className="text-lg font-semibold text-gray-900">Músculos</h3>
        <Button size="sm" onClick={openCreate}>
          + Agregar
        </Button>
      </div>

      <Input
        placeholder="Buscar músculo..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      {filteredMuscles.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">
          {muscles.length === 0 ? 'No hay músculos registrados' : 'Sin resultados'}
        </p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredMuscles.map((muscle) => (
            <div
              key={muscle.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <span className="text-gray-900">{muscle.name}</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(muscle)}>
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteConfirm(muscle)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-2">{muscles.length} músculos</p>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMuscle ? 'Editar músculo' : 'Nuevo músculo'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}
          <Input
            label="Nombre del músculo"
            value={muscleName}
            onChange={(e) => setMuscleName(e.target.value)}
            required
            placeholder="Ej: Cuádriceps"
          />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !muscleName.trim()}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Eliminar músculo"
        message={`¿Estás seguro de eliminar "${deleteConfirm?.name}"? Se eliminará de todos los ejercicios.`}
        confirmText="Eliminar"
        loading={deleting}
      />
    </div>
  )
}
