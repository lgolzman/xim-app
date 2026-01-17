import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import type { Invitation } from '../../lib/types'

export function RegisterForm() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [checkingInvitation, setCheckingInvitation] = useState(!!token)

  const { signUp } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (token) {
      checkInvitation(token)
    }
  }, [token])

  const checkInvitation = async (tokenValue: string) => {
    setCheckingInvitation(true)
    const { data, error: fetchError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', tokenValue)
      .eq('used', false)
      .single()

    if (fetchError || !data) {
      setError('Invitación inválida o ya utilizada')
    } else {
      const inv = data as Invitation
      if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
        setError('La invitación ha expirado')
      } else {
        setInvitation(inv)
        setEmail(inv.email)
      }
    }
    setCheckingInvitation(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    const { error } = await signUp(email, password, token || undefined)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/login', {
        state: { message: 'Cuenta creada exitosamente. Por favor, verifica tu email.' }
      })
    }
  }

  if (checkingInvitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (token && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Invitación inválida</h2>
            <p className="text-sm">{error}</p>
          </div>
          <Link to="/login" className="mt-4 inline-block text-blue-600 hover:text-blue-500">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Crear cuenta
          </h2>
          {invitation && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Invitado como <span className="font-medium">{invitation.role}</span>
            </p>
          )}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="tu@email.com"
              disabled={!!invitation}
            />

            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
            />

            <Input
              label="Confirmar contraseña"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>

          <p className="text-center text-sm text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium">
              Iniciar sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
