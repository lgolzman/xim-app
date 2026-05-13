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
  const [invitedName, setInvitedName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('consulta')
  const [createdInvitation, setCreatedInvitation] = useState<Invitation | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState<Invitation | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invitedName.trim() || !email.trim()) return

    setSaving(true)
    setError('')

    const { invitation, error } = await createInvitation(email.trim(), role, invitedName.trim())

    if (error) {
      setError(error)
      setSaving(false)
    } else {
      setCreatedInvitation(invitation)
      setSaving(false)
      setInvitedName('')
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

  const getInvitationEmailHref = (invitation: Invitation) => {
    const link = getInvitationLink(invitation.token)
    const subject = encodeURIComponent('Invitación a XIM App')
    const body = encodeURIComponent(
      `Hola,\n\nTe invito a crear tu cuenta en XIM App desde este link:\n\n${link}\n\nSi no esperabas esta invitación, podés ignorar este correo.`
    )

    return `mailto:${invitation.email}?subject=${subject}&body=${body}`
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setCreatedInvitation(null)
    setError('')
    setInvitedName('')
    setEmail('')
    setRole('consulta')
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
                      <p className="text-gray-900 font-medium">
                        {invitation.invited_name || invitation.email}
                      </p>
                      <p className="text-sm text-gray-500">
                        {invitation.invited_name && <>{invitation.email} · </>}
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
                      <p className="text-gray-600">{invitation.invited_name || invitation.email}</p>
                      <p className="text-sm text-gray-400">
                        {invitation.invited_name && <>{invitation.email} · </>}
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
        onClose={closeModal}
        title="Nueva invitación"
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
              <Button
                type="button"
                variant="secondary"
                onClick={() => copyLink(createdInvitation.token)}
              >
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
              <Button type="button" variant="ghost" onClick={closeModal}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}
          <Input
            label="Nombre"
            value={invitedName}
            onChange={(e) => setInvitedName(e.target.value)}
            required
            placeholder="Nombre del alumno"
          />
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
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !invitedName.trim() || !email.trim()}>
              {saving ? 'Creando...' : 'Crear invitación'}
            </Button>
          </div>
          </form>
        )}
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
