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
    let timeoutId: ReturnType<typeof setTimeout>
    let didInit = false

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (didInit) return // Timeout already fired
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          if (didInit) return

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
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        // Reset to logged-out state on error
        setSession(null)
        setUser(null)
        setProfile(null)
      } finally {
        if (!didInit) {
          didInit = true
          setLoading(false)
        }
      }
    }

    // Fallback timeout: if auth takes more than 5s, clear session and reload
    timeoutId = setTimeout(async () => {
      if (!didInit) {
        didInit = true

        // Check if we already tried to recover (prevent infinite reload loop)
        const recoveryAttempted = sessionStorage.getItem('auth-recovery-attempted')
        if (recoveryAttempted) {
          console.warn('Auth initialization timed out after recovery attempt')
          sessionStorage.removeItem('auth-recovery-attempted')
          setSession(null)
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }

        console.warn('Auth initialization timed out - clearing session and reloading')
        try {
          // Mark that we're attempting recovery
          sessionStorage.setItem('auth-recovery-attempted', 'true')
          // Clear Supabase storage keys from localStorage
          const keys = Object.keys(localStorage).filter(key =>
            key.startsWith('sb-') || key.includes('supabase')
          )
          keys.forEach(key => localStorage.removeItem(key))
          // Force a page reload to get a fresh Supabase client
          window.location.reload()
        } catch (e) {
          console.error('Error clearing session storage:', e)
          sessionStorage.removeItem('auth-recovery-attempted')
          setSession(null)
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    }, 5000)

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          setSession(session)
          setUser(session?.user ?? null)

          if (session?.user) {
            const profile = await fetchProfile(session.user.id)

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
            setProfile(null)
          }
        } catch (error) {
          console.error('Error in auth state change:', error)
        } finally {
          setLoading(false)
        }
      }
    )

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  // Handle visibility change - refresh session when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && session) {
        console.log('[Auth] Tab became visible, checking session...')

        let refreshCompleted = false
        const timeoutId = setTimeout(() => {
          if (!refreshCompleted) {
            console.warn('[Auth] Session refresh timed out - clearing session and reloading')
            // Clear Supabase storage and reload
            try {
              const keys = Object.keys(localStorage).filter(key =>
                key.startsWith('sb-') || key.includes('supabase')
              )
              keys.forEach(key => localStorage.removeItem(key))
              window.location.reload()
            } catch (e) {
              console.error('Error clearing session storage:', e)
            }
          }
        }, 5000)

        try {
          const { error } = await supabase.auth.refreshSession()
          refreshCompleted = true
          clearTimeout(timeoutId)

          if (error) {
            console.error('[Auth] Session refresh failed:', error)
            // Session invalid, clear state
            setSession(null)
            setUser(null)
            setProfile(null)
          } else {
            console.log('[Auth] Session refreshed successfully')
          }
        } catch (error) {
          refreshCompleted = true
          clearTimeout(timeoutId)
          console.error('[Auth] Session refresh error:', error)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [session])

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
