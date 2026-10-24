import { ImageResponse } from 'next/og'

import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import { fetchSharedRoute } from '@/services/sharedRouteApi'
import { fitMapView } from '@/services/staticMapView'
import type { MapView } from '@/services/staticMapView'
import { buildStaticMapUrl } from '@/services/staticMapUrl'
import PreviewImage from '@/views/share/PreviewImage'
import type { SharedRoute } from '@/types/sharedRoute'

export const alt = 'Map of the shared route with its checkpoints'
// The standard Open Graph size. A PNG of a dense city at this size weighs ~110 KB on the dark style
// (a light map came out at ~350 KB), well under the ~300 KB WhatsApp accepts for a large preview.
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const MAP_IMAGE_TIMEOUT_MS = 10000
const IMAGE_PADDING_PX = 90
const HTTP_NOT_FOUND = 404
const HTTP_BAD_GATEWAY = 502
const CACHE_CONTROL = 'public, max-age=3600'

const fail = (status: number, message: string): Response => new Response(message, { status })

/** The map of the route as a data URL, or null when Mapbox cannot draw it. */
const fetchMapDataUrl = async (route: SharedRoute, view: MapView, accessToken: string): Promise<string | null> => {
  const url = buildStaticMapUrl({ path: route.points, view, size, accessToken })
  try {
    const map = await fetch(url, { signal: AbortSignal.timeout(MAP_IMAGE_TIMEOUT_MS) })
    if (!map.ok) {
      console.error(`Mapbox could not draw the route ${route.id}: it answered ${map.status}`)
      return null
    }
    return `data:${contentType};base64,${Buffer.from(await map.arrayBuffer()).toString('base64')}`
  } catch (error) {
    // The URL carries the access token, so it is left out of the log.
    console.error(`Could not reach Mapbox to draw the route ${route.id}`, error)
    return null
  }
}

/**
 * The picture a link preview shows (WhatsApp, Instagram, X, ...): the route drawn on a map by Mapbox
 * at the size of an Open Graph image, with the start, finish and every checkpoint marked as in the app.
 */
export default async function Image({ params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params
  const route = await fetchSharedRoute(id)
  if (!route || !MAPBOX_ACCESS_TOKEN) return fail(HTTP_NOT_FOUND, 'Route not found')

  const framed = [...route.points, ...route.waypoints.map(({ coordinates }) => coordinates)]
  const view = fitMapView(framed, size, IMAGE_PADDING_PX)
  const mapSrc = await fetchMapDataUrl(route, view, MAPBOX_ACCESS_TOKEN)
  if (!mapSrc) return fail(HTTP_BAD_GATEWAY, 'Map unavailable')

  return new ImageResponse(
    <PreviewImage mapSrc={mapSrc} path={route.points} waypoints={route.waypoints} view={view} size={size} />,
    { ...size, headers: { 'Cache-Control': CACHE_CONTROL } },
  )
}
