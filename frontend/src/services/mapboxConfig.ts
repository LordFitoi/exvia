export const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

export const DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox'
// Only roads the profile can drive on count as streets, so footpaths and parks never match.
export const STREET_PROFILE = 'driving'
// The same roads, with the live traffic on them: its durations tell which route is the fastest right now.
export const TRAFFIC_PROFILE = 'driving-traffic'
export const HTTP_UNPROCESSABLE_ENTITY = 422
