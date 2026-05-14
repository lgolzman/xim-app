import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Invitation, UserRole } from '../lib/types'

export function useInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(false)

  const fetchInvitations = useCallback(async () => {
    if (!isMountedRef.current) return
    setLoading(true)
    setError(null)

    try {
      const query = supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      if (!isMountedRef.current) return
      setInvitations(data || [])
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error && err.name === 'AbortError'
        ? 'La solicitud tardó demasiado. Intenta recargar la página.'
        : err instanceof Error ? err.message : 'Error al cargar invitaciones')
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    fetchInvitations()
    return () => {
      isMountedRef.current = false
    }
  }, [fetchInvitations])

  const createInvitation = async (email: string, role: UserRole, invitedName?: string): Promise<{ invitation: Invitation | null; error: string | null }> => {
    try {
      const { data, error: insertError } = await supabase
        .from('invitations')
        .insert({
          email: email.toLowerCase(),
          role,
          invited_name: invitedName?.trim() || null,
        } as any)
        .select()
        .single()

      if (insertError) throw insertError
      await fetchInvitations()
      return { invitation: data as Invitation, error: null }
    } catch (err) {
      return {
        invitation: null,
        error: err instanceof Error ? err.message : 'Error al crear invitación',
      }
    }
  }

  const deleteInvitation = async (id: string) => {
    try {
      const { error } = await supabase.from('invitations').delete().eq('id', id)
      if (error) throw error
      await fetchInvitations()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error al eliminar invitación' }
    }
  }

  return {
    invitations,
    loading,
    error,
    refetch: fetchInvitations,
    createInvitation,
    deleteInvitation,
  }
}
