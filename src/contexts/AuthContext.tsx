/**
 * AuthContext - Gestione autenticazione Supabase
 * Fornisce: user, session, signIn, signOut, loading state
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { signInWithPassword, signOut as supabaseSignOut, onAuthStateChange, getSession } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Recupera sessione iniziale
    getSession().then((session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Ascolta cambiamenti auth
    const { data: { subscription } } = onAuthStateChange((_event: string, session: unknown) => {
      const typedSession = session as Session | null
      setSession(typedSession)
      setUser(typedSession?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    await signInWithPassword(email, password)
    // onAuthStateChange aggiornerà lo stato automaticamente
  }

  const signOut = async () => {
    await supabaseSignOut()
    // onAuthStateChange pulirà lo stato automaticamente
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve essere usato dentro AuthProvider')
  }
  return context
}