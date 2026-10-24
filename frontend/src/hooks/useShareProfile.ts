'use client'

import { useCallback, useState } from 'react'

type ShareOutcome = 'idle' | 'copied' | 'failed'

interface ShareProfile {
  /** True from the moment the link is copied until the notice is dismissed. */
  isCopied: boolean
  hasFailed: boolean
  copyLink: () => Promise<void>
  dismissCopied: () => void
}

const buildProfileUrl = (username: string): string =>
  `${window.location.origin}/profile/${encodeURIComponent(username)}/`

/**
 * Copies the link to a rider's profile to the clipboard. Only signed-in riders can open it.
 * The clipboard needs a secure context: https, or localhost.
 */
export const useShareProfile = (username: string): ShareProfile => {
  const [outcome, setOutcome] = useState<ShareOutcome>('idle')

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(buildProfileUrl(username))
      setOutcome('copied')
    } catch (error) {
      console.error(`Could not copy the link of the profile of ${username}`, error)
      setOutcome('failed')
    }
  }

  const dismissCopied = useCallback(() => setOutcome('idle'), [])

  return { isCopied: outcome === 'copied', hasFailed: outcome === 'failed', copyLink, dismissCopied }
}
