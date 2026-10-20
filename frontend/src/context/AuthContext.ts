'use client'

import { createContext } from 'react'

import type { LoginCredentials, SignupInput, User } from '@/types/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  readonly status: AuthStatus
  readonly user: User | null
  readonly login: (credentials: LoginCredentials) => Promise<void>
  /** Registers the account; it stays inactive until an admin approves it, so no session starts. */
  readonly signup: (input: SignupInput) => Promise<void>
  readonly logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
