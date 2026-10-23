import type { Coordinates } from '@/types/geolocation'

const MAX_LATITUDE = 90
const MAX_LONGITUDE = 180
const MINUTES_PER_DEGREE = 60
const SECONDS_PER_DEGREE = 3600
// The exact pin of a Google Maps place link, which is better than the `@` of the map's center.
const GOOGLE_PIN = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/
// Both numbers need decimals, so "calle 5 10" is not a spot.
const DECIMAL_PAIR = /(-?\d{1,3}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)/
// 18°28'28.2"N: the minutes and the seconds are optional.
const DMS_PART = /(\d{1,3})\s*°\s*(?:(\d{1,2})\s*['′’]\s*)?(?:(\d{1,2}(?:\.\d+)?)\s*(?:"|″|”|'')\s*)?([NSEW])/gi
const NEGATIVE_HEMISPHERES = 'SW'
const LATITUDE_HEMISPHERES = 'NS'

const toCoordinates = (latitude: number, longitude: number): Coordinates | null =>
  Math.abs(latitude) <= MAX_LATITUDE && Math.abs(longitude) <= MAX_LONGITUDE ? { longitude, latitude } : null

const readDecimalPair = (text: string): Coordinates | null => {
  const match = GOOGLE_PIN.exec(text) ?? DECIMAL_PAIR.exec(text)
  return match ? toCoordinates(Number(match[1]), Number(match[2])) : null
}

const readDegrees = (text: string): { hemisphere: string; value: number }[] =>
  [...text.matchAll(DMS_PART)].map(([, degrees, minutes = '0', seconds = '0', letter]) => {
    const hemisphere = letter.toUpperCase()
    const magnitude =
      Number(degrees) + Number(minutes) / MINUTES_PER_DEGREE + Number(seconds) / SECONDS_PER_DEGREE
    return { hemisphere, value: NEGATIVE_HEMISPHERES.includes(hemisphere) ? -magnitude : magnitude }
  })

const readDegreesMinutesSeconds = (text: string): Coordinates | null => {
  const parts = readDegrees(text)
  const latitude = parts.find(({ hemisphere }) => LATITUDE_HEMISPHERES.includes(hemisphere))
  const longitude = parts.find(({ hemisphere }) => !LATITUDE_HEMISPHERES.includes(hemisphere))
  return latitude && longitude ? toCoordinates(latitude.value, longitude.value) : null
}

/**
 * The spot that the text is, as Google Maps takes it: `18.4745, -69.9330`, `18°28'28.2"N 69°55'58.8"W`,
 * or a Google Maps link that carries one. Null when the text names a place instead.
 */
export const parseCoordinateQuery = (text: string): Coordinates | null => {
  const readable = text.replace(/%2C/gi, ',')
  return readDecimalPair(readable) ?? readDegreesMinutesSeconds(readable)
}
