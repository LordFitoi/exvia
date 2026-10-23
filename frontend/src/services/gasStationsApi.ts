import { requestOverpassElements } from '@/services/overpassApi'
import { readElementCoordinates } from '@/services/placeParsing'
import { isRecord } from '@/services/typeGuards'
import type { Coordinates } from '@/types/geolocation'

export interface GasStation {
  /** The OpenStreetMap type and id, such as `node123`: a station mapped twice is not shown twice. */
  readonly id: string
  readonly coordinates: Coordinates
}

/** A box of the map: the south-west and north-east corners, in degrees. */
export interface MapBounds {
  readonly west: number
  readonly south: number
  readonly east: number
  readonly north: number
}

const parseGasStation = (element: unknown): GasStation | null => {
  if (!isRecord(element) || typeof element.id !== 'number' || typeof element.type !== 'string') return null
  const coordinates = readElementCoordinates(element)
  return coordinates && { id: `${element.type}${element.id}`, coordinates }
}

/** Every gas station OpenStreetMap has in `bounds`, named or not. */
export const fetchGasStations = async (
  { west, south, east, north }: MapBounds,
  signal: AbortSignal,
): Promise<GasStation[]> => {
  const statement = `nwr["amenity"="fuel"](${south},${west},${north},${east});out center;`
  const elements = await requestOverpassElements(statement, signal)
  return elements.map(parseGasStation).filter((station) => station !== null)
}
