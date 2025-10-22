import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  role: string | null
  roleLoading: boolean
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState<boolean>(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    // Fetch role from users table when user is present
    const fetchRole = async (userId: string) => {
      console.log('[AuthProvider] Starting role fetch for userId:', userId)
      setRoleLoading(true)
      try {
        console.log('[AuthProvider] Current session:', await supabase.auth.getSession())
        console.log('[AuthProvider] Querying users table with user_id:', userId)
        
        // Try to fetch the user's role using the correct column name
        const { data, error, status } = await supabase
          .from('users')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle()

        console.log('[AuthProvider] Query response - status:', status, 'data:', data, 'error:', error)
        console.log('[AuthProvider] Full error details:', JSON.stringify(error, null, 2))

        if (error) {
          console.error('[AuthProvider] Error fetching role - Code:', error.code, 'Message:', error.message)
          setRole(null)
          setRoleLoading(false)
          return
        }

        if (!data) {
          console.warn('[AuthProvider] No user record found in users table for userId:', userId)
          setRole(null)
          setRoleLoading(false)
          return
        }

        const fetchedRole = data?.role ?? null
        console.log('[AuthProvider] Successfully fetched role:', fetchedRole)
        setRole(fetchedRole)
      } catch (e) {
        console.error('[AuthProvider] Exception while fetching role:', e)
        setRole(null)
      } finally {
        setRoleLoading(false)
      }
    }

    if (user) {
      console.log('[AuthProvider] User detected, fetching role:', user.id)
      fetchRole(user.id)
    } else {
      console.log('[AuthProvider] No user, clearing role')
      setRole(null)
      setRoleLoading(false)
    }
  }, [user])

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signInWithGoogle = async () => {
    const redirectUrl = import.meta.env.VITE_SITE_URL || `${window.location.origin}/`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setRole(null)
    setRoleLoading(false)
  }

  const value = {
    user,
    session,
    role,
    roleLoading,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}