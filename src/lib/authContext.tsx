import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthState {
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  changePassword: (newPassword: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth musí být uvnitř AuthProvider')
  return ctx
}

/** Přeloží časté chybové hlášky Supabase Auth do češtiny. */
function translate(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Nesprávný e-mail nebo heslo.'
  if (/email not confirmed/i.test(msg)) return 'E-mail není potvrzený.'
  if (/rate limit|too many/i.test(msg)) return 'Příliš mnoho pokusů. Zkuste to za chvíli.'
  if (/password should be at least/i.test(msg)) return 'Heslo musí mít alespoň 6 znaků.'
  return msg
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    return { error: error ? translate(error.message) : null }
  }

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut()
  }

  const changePassword = async (newPassword: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error: error ? translate(error.message) : null }
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}
