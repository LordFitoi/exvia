const KILOMETRES_PER_HOUR_PER_METRE_PER_SECOND = 3.6
// Readings below this are parking-pace speeds (a stop, a rest, manoeuvring), not riding, so they are left out of the stats.
export const MOVING_SPEED_KMH = 10

/** Running totals of the GPS speed readings of a ride, in km/h, stops left out. */
export interface SpeedStats {
  readonly max: number | null
  readonly min: number | null
  readonly total: number
  readonly count: number
}

export const EMPTY_SPEED_STATS: SpeedStats = { max: null, min: null, total: 0, count: 0 }

/** The totals with one more reading (m/s, or null when the device gave none) counted in. */
export const addSpeedReading = (stats: SpeedStats, metersPerSecond: number | null): SpeedStats => {
  if (metersPerSecond === null) return stats
  const speed = metersPerSecond * KILOMETRES_PER_HOUR_PER_METRE_PER_SECOND
  if (speed < MOVING_SPEED_KMH) return stats
  return {
    max: Math.max(stats.max ?? speed, speed),
    min: Math.min(stats.min ?? speed, speed),
    total: stats.total + speed,
    count: stats.count + 1,
  }
}

/** The mean of the counted readings, or null when there were none. */
export const getAverageSpeed = ({ total, count }: SpeedStats): number | null =>
  count === 0 ? null : total / count
