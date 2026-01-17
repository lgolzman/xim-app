import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useMovementPatterns } from '../../hooks/useMovementPatterns'
import type { MovementPattern } from '../../lib/types'

export function MovementPatternManager() {
  const { patterns, loading, createPattern, updatePattern, deletePattern } = useMovementPatterns()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPattern, setEditingPattern] = useState<MovementPattern | null>(null)
  const [patternName, setPatternName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState<MovementPattern | null>(null)
  const [deleting, setDeleting] = useState(false)

  const openCreate = () => {
    setEditingPattern(null)
    setPatternName('')
    setError('')
    setIsModalOpen(true)
  }

  const openEdit = (pattern: MovementPattern) => {
    setEditingPattern(pattern)
    setPatternName(pattern.name)
    setError('')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patternName.trim()) return

    setSaving(true)
    setError('')

    const { error } = editingPattern
      ? await updatePattern(editingPattern.id, patternName.trim())
      : await createPattern(patternName.trim())

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
    const { error } = await deletePattern(deleteConfirm.id)

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
        <h3 className="text-lg font-semibold text-gray-900">Patrones de Movimiento</h3>
        <Button size="sm" onClick={openCreate}>
          + Agregar
        </Button>
      </div>

      {patterns.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">No hay patrones registrados</p>
      ) : (
        <div className="space-y-2">
          {patterns.map((pattern) => (
            <div
              key={pattern.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <span className="text-gray-900">{pattern.name}</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(pattern)}>
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteConfirm(pattern)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPattern ? 'Editar patrón' : 'Nuevo patrón'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}
          <Input
            label="Nombre del patrón"
            value={patternName}
            onChange={(e) => setPatternName(e.target.value)}
            required
            placeholder="Ej: Sentadilla"
          />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !patternName.trim()}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Eliminar patrón"
        message={`¿Estás seguro de eliminar "${deleteConfirm?.name}"? Los ejercicios asociados perderán esta referencia.`}
        confirmText="Eliminar"
        loading={deleting}
      />
    </div>
  )
}
