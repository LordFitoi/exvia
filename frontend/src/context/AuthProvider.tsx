'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { AuthContext } from '@/context/AuthContext'
import type { AuthContextValue, AuthStatus } from '@/context/AuthContext'
import { createAccount } from '@/services/authApi'
import { endSession, restoreSession, startSession } from '@/services/session'
import type { LoginCredentials, User } from '@/types/auth'

interface AuthState {
  readonly status: AuthStatus
  readonly user: User | null
}

interface AuthProviderProps {
  children: ReactNode
}

const INITIAL_STATE: AuthState = { status: 'loading', user: null }
const ANONYMOUS_STATE: AuthState = { status: 'anonymous', user: null }

const toAuthenticated = (user: User): AuthState => ({ status: 'authenticated', user })

export default function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(INITIAL_STATE)

  useEffect(() => {
    let isCancelled = false
    const restore = async () => {
      try {
        const user = await restoreSession()
        if (!isCancelled) setState(user ? toAuthenticated(user) : ANONYMOUS_STATE)
      } catch (error) {
        console.error('Could not restore the previous session', error)
        if (!isCancelled) setState(ANONYMOUS_STATE)
      }
    }
    restore()
    return () => {
      isCancelled = true
    }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setState(toAuthenticated(await startSession(credentials)))
  }, [])

  const logout = useCallback(async () => {
    endSession()
    setState(ANONYMOUS_STATE)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, signup: createAccount, logout }),
    [state, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
