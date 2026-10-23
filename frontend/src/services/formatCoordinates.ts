import type { Coordinates } from '@/types/geolocation'

const COORDINATE_DECIMALS = 5

/** "18.47450, -69.93300": latitude then longitude, the order people paste into a search box. */
export const formatCoordinates = ({ latitude, longitude }: Coordinates): string =>
  `${latitude.toFixed(COORDINATE_DECIMALS)}, ${longitude.toFixed(COORDINATE_DECIMALS)}`
