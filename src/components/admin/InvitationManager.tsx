import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Modal } from '../ui/Modal'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useInvitations } from '../../hooks/useInvitations'
import type { Invitation, UserRole } from '../../lib/types'

export function InvitationManager() {
  const { invitations, loading, createInvitation, deleteInvitation } = useInvitations()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('consulta')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState<Invitation | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setSaving(true)
    setError('')

    const { error } = await createInvitation(email.trim(), role)

    if (error) {
      setError(error)
      setSaving(false)
    } else {
      setIsModalOpen(false)
      setSaving(false)
      setEmail('')
      setRole('consulta')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return

    setDeleting(true)
    const { error } = await deleteInvitation(deleteConfirm.id)

    if (error) {
      alert(error)
    }

    setDeleting(false)
    setDeleteConfirm(null)
  }

  const getInvitationLink = (token: string) => {
    return `${window.location.origin}/register?token=${token}`
  }

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getInvitationLink(token))
    alert('Link copiado al portapapeles')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const pendingInvitations = invitations.filter((inv) => !inv.used)
  const usedInvitations = invitations.filter((inv) => inv.used)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Invitaciones</h3>
        <Button size="sm" onClick={() => setIsModalOpen(true)}>
          + Nueva invitación
        </Button>
      </div>

      {pendingInvitations.length === 0 && usedInvitations.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">No hay invitaciones</p>
      ) : (
        <div className="space-y-4">
          {pendingInvitations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Pendientes</h4>
              <div className="space-y-2">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <div>
                      <p className="text-gray-900 font-medium">{invitation.email}</p>
                      <p className="text-sm text-gray-500">
                        Rol: <span className="font-medium">{invitation.role}</span>
                        {invitation.expires_at && (
                          <> · Expira: {new Date(invitation.expires_at).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyLink(invitation.token)}
                      >
                        Copiar link
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(invitation)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {usedInvitations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Utilizadas</h4>
              <div className="space-y-2">
                {usedInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="text-gray-600">{invitation.email}</p>
                      <p className="text-sm text-gray-400">
                        Rol: {invitation.role} · Registrado
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva invitación"
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="usuario@email.com"
          />
          <Select
            label="Rol"
            options={[
              { value: 'consulta', label: 'Consulta (solo lectura)' },
              { value: 'admin', label: 'Admin (lectura y escritura)' },
            ]}
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !email.trim()}>
              {saving ? 'Creando...' : 'Crear invitación'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Eliminar invitación"
        message={`¿Estás seguro de eliminar la invitación para "${deleteConfirm?.email}"?`}
        confirmText="Eliminar"
        loading={deleting}
      />
    </div>
  )
}
