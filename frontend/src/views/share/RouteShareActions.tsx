'use client'

import { buildGoogleMapsUrl, DESKTOP_MAX_WAYPOINTS, MOBILE_MAX_WAYPOINTS } from '@/services/googleMapsUrl'
import type { Coordinates } from '@/types/geolocation'

const MOBILE_USER_AGENT = /Android|iPhone|iPad|iPod|Mobi/i

interface RouteShareActionsProps {
  path: readonly Coordinates[]
}

const isMobileBrowser = (): boolean => MOBILE_USER_AGENT.test(window.navigator.userAgent)

/** What a visitor can do with the route: open it in Google Maps. */
export default function RouteShareActions({ path }: RouteShareActionsProps) {
  const handleOpenGoogleMaps = () => {
    const maxWaypoints = isMobileBrowser() ? MOBILE_MAX_WAYPOINTS : DESKTOP_MAX_WAYPOINTS
    window.open(buildGoogleMapsUrl(path, maxWaypoints), '_blank', 'noopener,noreferrer')
  }

  return (
    <button className="button button-primary button-block" type="button" onClick={handleOpenGoogleMaps}>
      <span className="icon icon-navigation" aria-hidden="true"></span>Open in Google Maps
    </button>
  )
}
