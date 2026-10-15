import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import { fetchSharedRoute } from '@/services/sharedRouteApi'
import { buildStaticMapUrl } from '@/services/staticMapUrl'

export const alt = 'Map of the shared route'
// The standard Open Graph size. A PNG of a dense city at this size weighs ~110 KB on the dark style
// (a light map came out at ~350 KB), well under the ~300 KB WhatsApp accepts for a large preview.
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const MAP_IMAGE_TIMEOUT_MS = 10000
const HTTP_NOT_FOUND = 404
const HTTP_BAD_GATEWAY = 502
const CACHE_CONTROL = 'public, max-age=3600'

const fail = (status: number, message: string): Response => new Response(message, { status })

/**
 * The picture a link preview shows (WhatsApp, Instagram, X, ...): the route drawn on a map at the
 * size of an Open Graph image. Mapbox draws it and it is passed through as it is.
 */
export default async function Image({ params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params
  const route = await fetchSharedRoute(id)
  if (!route || !MAPBOX_ACCESS_TOKEN) return fail(HTTP_NOT_FOUND, 'Route not found')

  const url = buildStaticMapUrl({ path: route.points, size, accessToken: MAPBOX_ACCESS_TOKEN })
  try {
    const map = await fetch(url, { signal: AbortSignal.timeout(MAP_IMAGE_TIMEOUT_MS) })
    if (!map.ok) {
      console.error(`Mapbox could not draw the route ${id}: it answered ${map.status}`)
      return fail(HTTP_BAD_GATEWAY, 'Map unavailable')
    }
    return new Response(map.body, { headers: { 'Content-Type': contentType, 'Cache-Control': CACHE_CONTROL } })
  } catch (error) {
    // The URL carries the access token, so it is left out of the log.
    console.error(`Could not reach Mapbox to draw the route ${id}`, error)
    return fail(HTTP_BAD_GATEWAY, 'Map unavailable')
  }
}
