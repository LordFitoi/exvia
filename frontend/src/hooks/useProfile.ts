'use client'

import { useEffect, useState } from 'react'

import { fetchProfile } from '@/services/profileApi'
import type { Profile } from '@/types/profile'

type ProfileStatus = 'loading' | 'ready' | 'failed'

interface ProfileHandle {
  readonly status: ProfileStatus
  readonly profile: Profile | null
  /** Fetches the profile again, keeping the one on screen until the new one arrives. */
  readonly reload: () => void
  /** Fetches the profile again after a failed load, showing the loading state meanwhile. */
  readonly retry: () => void
}

/** The caller's profile. */
export const useProfile = (): ProfileHandle => {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isFailed, setIsFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false
    const load = async () => {
      try {
        const loaded = await fetchProfile()
        if (isCancelled) return
        setProfile(loaded)
        setIsFailed(false)
      } catch (error) {
        console.error('Could not load the profile', error)
        if (!isCancelled) setIsFailed(true)
      }
    }
    load()
    return () => {
      isCancelled = true
    }
  }, [attempt])

  const reload = () => setAttempt((previous) => previous + 1)
  const retry = () => {
    setIsFailed(false)
    reload()
  }
  const getStatus = (): ProfileStatus => {
    if (profile) return 'ready'
    return isFailed ? 'failed' : 'loading'
  }

  return { status: getStatus(), profile, reload, retry }
}
