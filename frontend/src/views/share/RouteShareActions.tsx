'use client'

import { useRouter } from 'next/navigation'

import { useAuth } from '@/hooks/useAuth'
import { buildGoogleMapsUrl, DESKTOP_MAX_WAYPOINTS, MOBILE_MAX_WAYPOINTS } from '@/services/googleMapsUrl'
import type { Coordinates } from '@/types/geolocation'

const HOME_PATH = '/'
const MOBILE_USER_AGENT = /Android|iPhone|iPad|iPod|Mobi/i

interface RouteShareActionsProps {
  path: readonly Coordinates[]
}

const isMobileBrowser = (): boolean => MOBILE_USER_AGENT.test(window.navigator.userAgent)

/** What a visitor can do with the route: a signed-in rider goes back to the app, anyone else opens it in Google Maps. */
export default function RouteShareActions({ path }: RouteShareActionsProps) {
  const router = useRouter()
  const { status } = useAuth()

  // Back to wherever the rider came from, or Home when the link was opened directly.
  const handleClose = () => {
    if (window.history.length > 1) router.back()
    else router.replace(HOME_PATH)
  }

  const handleOpenGoogleMaps = () => {
    const maxWaypoints = isMobileBrowser() ? MOBILE_MAX_WAYPOINTS : DESKTOP_MAX_WAYPOINTS
    window.open(buildGoogleMapsUrl(path, maxWaypoints), '_blank', 'noopener,noreferrer')
  }

  if (status === 'loading') return <div className="share-actions-placeholder" aria-hidden="true"></div>

  if (status === 'authenticated') {
    return (
      <button className="button button-outline button-block" type="button" onClick={handleClose}>
        <span className="icon icon-x" aria-hidden="true"></span>Close
      </button>
    )
  }

  return (
    <button className="button button-primary button-block" type="button" onClick={handleOpenGoogleMaps}>
      <span className="icon icon-navigation" aria-hidden="true"></span>Open in Google Maps
    </button>
  )
}
