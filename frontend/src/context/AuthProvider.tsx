'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { AuthContext } from '@/context/AuthContext'
import type { AuthContextValue, AuthStatus } from '@/context/AuthContext'
import { createAccount } from '@/services/authApi'
import { endSession, restoreSession, startSession } from '@/services/session'
import { removePushSubscription } from '@/services/webPush'
import type { LoginCredentials, SignupInput, User } from '@/types/auth'

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

// A slow network must not keep the rider from signing out.
const PUSH_REMOVAL_TIMEOUT_MS = 3000

/** Stops this phone's notifications for the rider who is leaving, while their token still works. */
const stopPushNotifications = async (): Promise<void> => {
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, PUSH_REMOVAL_TIMEOUT_MS))
  try {
    await Promise.race([removePushSubscription(), timeout])
  } catch (error) {
    console.error('Could not remove the push subscription on logout', error)
  }
}

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

  const signup = useCallback(async (input: SignupInput) => {
    await createAccount(input)
    setState(toAuthenticated(await startSession(input)))
  }, [])

  const logout = useCallback(async () => {
    await stopPushNotifications()
    endSession()
    setState(ANONYMOUS_STATE)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, signup, logout }),
    [state, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
