export const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

export const DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox'
// Only roads the profile can drive on count as streets, so footpaths and parks never match.
export const STREET_PROFILE = 'driving'
export const HTTP_UNPROCESSABLE_ENTITY = 422
