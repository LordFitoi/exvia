'use client'

import { createContext } from 'react'

import type { LoginCredentials, SignupInput, User } from '@/types/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  readonly status: AuthStatus
  readonly user: User | null
  readonly login: (credentials: LoginCredentials) => Promise<void>
  readonly signup: (input: SignupInput) => Promise<void>
  readonly logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
