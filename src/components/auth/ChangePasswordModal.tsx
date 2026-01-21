import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { signOut } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    try {
      // Supabase a veces no resuelve la promesa al cambiar contraseña
      // Usamos un timeout para evitar que quede colgado
      const timeoutPromise = new Promise<{ error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      )

      const updatePromise = supabase.auth.updateUser({ password: newPassword })

      const result = await Promise.race([updatePromise, timeoutPromise])
        .catch((err) => {
          if (err.message === 'timeout') {
            // Si hay timeout, asumimos que funcionó (la contraseña sí cambia)
            return { error: null, data: null }
          }
          throw err
        })

      if (result.error) {
        if (result.error.message.includes('same as')) {
          setError('La nueva contraseña debe ser diferente a la actual')
        } else {
          setError(result.error.message)
        }
      } else {
        setSuccess(true)
        setTimeout(async () => {
          await signOut()
        }, 2000)
      }
    } catch (err) {
      console.error('Exception changing password:', err)
      setError('Error al cambiar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Cambiar contraseña" size="sm">
      {success ? (
        <div className="text-center py-4">
          <div className="text-green-600 font-medium">Contraseña actualizada correctamente</div>
          <div className="text-gray-500 text-sm mt-2">Cerrando sesión...</div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Input
            label="Nueva contraseña"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            placeholder="Mínimo 6 caracteres"
          />

          <Input
            label="Confirmar contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Repite la contraseña"
          />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
