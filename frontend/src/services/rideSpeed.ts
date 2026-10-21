const KILOMETRES_PER_HOUR_PER_METRE_PER_SECOND = 3.6

/** The top speed in km/h once one more GPS reading (m/s, or null when the device gave none) is counted in. */
export const addSpeedReading = (maxSpeed: number | null, metersPerSecond: number | null): number | null => {
  if (metersPerSecond === null) return maxSpeed
  const speed = metersPerSecond * KILOMETRES_PER_HOUR_PER_METRE_PER_SECOND
  return Math.max(maxSpeed ?? speed, speed)
}
