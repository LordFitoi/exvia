'use client'

import { useCallback, useState } from 'react'

export const LINK_COPIED_MESSAGE = 'Link copied to the clipboard'
export const SHARE_FAILED_MESSAGE = 'The link could not be copied. Check that the browser allows it and try again.'

interface ShareRouteOptions {
  /** The route to share, or null when none is selected. */
  routeId: string | null
}

interface ShareRoute {
  /** True from the moment the link is copied until the notice is dismissed. */
  isCopied: boolean
  hasFailed: boolean
  copyLink: () => Promise<void>
  dismissCopied: () => void
}

const buildShareUrl = (routeId: string): string => `${window.location.origin}/routes/${routeId}/`

/**
 * Copies the public link of a route to the clipboard. The outcome belongs to the route it was set
 * for, so selecting another row clears it. The clipboard needs a secure context: https, or localhost.
 */
export const useShareRoute = ({ routeId }: ShareRouteOptions): ShareRoute => {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [failedId, setFailedId] = useState<string | null>(null)

  const copyLink = async () => {
    if (routeId === null) return
    setFailedId(null)
    try {
      await navigator.clipboard.writeText(buildShareUrl(routeId))
      setCopiedId(routeId)
    } catch (error) {
      console.error(`Could not copy the link of route ${routeId}`, error)
      setCopiedId(null)
      setFailedId(routeId)
    }
  }

  const dismissCopied = useCallback(() => setCopiedId(null), [])

  return {
    isCopied: routeId !== null && copiedId === routeId,
    hasFailed: routeId !== null && failedId === routeId,
    copyLink,
    dismissCopied,
  }
}
