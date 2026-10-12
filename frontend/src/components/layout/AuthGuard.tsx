'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { ReactNode } from 'react'

import LoadingScreen from '@/components/feedback/LoadingScreen'
import { useAuth } from '@/hooks/useAuth'

type RequiredStatus = 'authenticated' | 'anonymous'

interface AuthGuardProps {
  require: RequiredStatus
  children: ReactNode
}

const REDIRECT_TARGETS: Record<RequiredStatus, string> = {
  authenticated: '/login',
  anonymous: '/',
}

export default function AuthGuard({ require, children }: AuthGuardProps) {
  const { status } = useAuth()
  const router = useRouter()
  const isAllowed = status === require
  const shouldRedirect = status !== 'loading' && !isAllowed

  useEffect(() => {
    if (shouldRedirect) router.replace(REDIRECT_TARGETS[require])
  }, [shouldRedirect, require, router])

  if (!isAllowed) return <LoadingScreen />
  return children
}
