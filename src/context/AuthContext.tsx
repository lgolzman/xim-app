import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile, Invitation } from '../lib/types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
  isDisabled: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, token?: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDisabled, setIsDisabled] = useState(false)

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }
    return data as Profile
  }

  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!isMounted) return

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          if (!isMounted) return

          // Verificar si la cuenta está inhabilitada
          if (profile && profile.active === false) {
            console.warn('Account is disabled, signing out')
            setIsDisabled(true)
            await supabase.auth.signOut()
            setSession(null)
            setUser(null)
            setProfile(null)
            return
          }

          setIsDisabled(false)
          setProfile(profile)
        } else {
          setIsDisabled(false)
          setProfile(null)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          if (!isMounted) return

          setSession(session)
          setUser(session?.user ?? null)

          if (session?.user) {
            const profile = await fetchProfile(session.user.id)
            if (!isMounted) return

            // Verificar si la cuenta está inhabilitada
            if (profile && profile.active === false) {
              console.warn('Account is disabled, signing out')
              setIsDisabled(true)
              await supabase.auth.signOut()
              setSession(null)
              setUser(null)
              setProfile(null)
              return
            }

            setIsDisabled(false)
            setProfile(profile)
          } else {
            setIsDisabled(false)
            setProfile(null)
          }
        } catch (error) {
          console.error('Error in auth state change:', error)
        } finally {
          if (isMounted) {
            setLoading(false)
          }
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error: error ? new Error(error.message) : null }
  }

  const signUp = async (email: string, password: string, token?: string) => {
    if (token) {
      const { data: invitation, error: invError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .single()

      if (invError || !invitation) {
        return { error: new Error('Invitación inválida o expirada') }
      }

      const inv = invitation as Invitation

      if (inv.email.toLowerCase() !== email.toLowerCase()) {
        return { error: new Error('El email no coincide con la invitación') }
      }

      if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
        return { error: new Error('La invitación ha expirado') }
      }
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    return { error: error ? new Error(error.message) : null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  const refreshProfile = async () => {
    if (user) {
      const profile = await fetchProfile(user.id)
      setProfile(profile)
    }
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isAdmin,
        isDisabled,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
