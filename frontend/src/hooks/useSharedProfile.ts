'use client'

import { useEffect, useState } from 'react'

import { ApiError } from '@/services/apiClient'
import { fetchSharedProfile } from '@/services/profileApi'
import type { SharedProfile } from '@/types/profile'

const HTTP_NOT_FOUND = 404

type SharedProfileStatus = 'loading' | 'ready' | 'notFound' | 'failed'

interface Failure {
  readonly username: string
  readonly isNotFound: boolean
}

interface SharedProfileHandle {
  readonly status: SharedProfileStatus
  /** The profile of the requested username, once loaded. */
  readonly profile: SharedProfile | null
  readonly retry: () => void
}

/** Another rider's profile. The status is derived from which username has loaded or failed. */
export const useSharedProfile = (username: string): SharedProfileHandle => {
  const [loaded, setLoaded] = useState<SharedProfile | null>(null)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false
    const load = async () => {
      try {
        const profile = await fetchSharedProfile(username)
        if (!isCancelled) setLoaded(profile)
      } catch (error) {
        const isNotFound = error instanceof ApiError && error.status === HTTP_NOT_FOUND
        if (!isNotFound) console.error(`Could not load the profile of ${username}`, error)
        if (!isCancelled) setFailure({ username, isNotFound })
      }
    }
    load()
    return () => {
      isCancelled = true
    }
  }, [username, attempt])

  const getStatus = (): SharedProfileStatus => {
    if (loaded?.username === username) return 'ready'
    if (failure?.username !== username) return 'loading'
    return failure.isNotFound ? 'notFound' : 'failed'
  }

  const retry = () => {
    setFailure(null)
    setAttempt((previous) => previous + 1)
  }

  return { status: getStatus(), profile: loaded?.username === username ? loaded : null, retry }
}
