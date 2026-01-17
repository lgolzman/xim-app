import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Invitation, UserRole } from '../lib/types'

export function useInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvitations(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar invitaciones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  const createInvitation = async (email: string, role: UserRole) => {
    try {
      const { error: insertError } = await supabase.from('invitations').insert({
        email: email.toLowerCase(),
        role,
      } as any)
      if (insertError) throw insertError
      await fetchInvitations()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error al crear invitación' }
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
