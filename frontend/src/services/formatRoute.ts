const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const MINUTE_DIGITS = 2

export const formatDistance = (kilometres: number): string => `${kilometres.toFixed(1)} km`

/** "42 min", or "1 h 05 min" from an hour up; never less than a minute. */
export const formatDuration = (seconds: number): string => {
  const totalMinutes = Math.max(1, Math.round(seconds / SECONDS_PER_MINUTE))
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR)
  const minutes = totalMinutes % MINUTES_PER_HOUR
  if (hours === 0) return `${minutes} min`
  return `${hours} h ${String(minutes).padStart(MINUTE_DIGITS, '0')} min`
}

const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR
const CLOCK_DIGITS = 2
const NO_SPEED = '–'
const KILOMETRES_PER_HOUR_PER_METRE_PER_SECOND = 3.6

const padClock = (value: number): string => String(value).padStart(CLOCK_DIGITS, '0')

/** An elapsed time as a stopwatch reads: "42:10", or "1:05:12" from an hour up. */
export const formatClock = (seconds: number): string => {
  const total = Math.floor(seconds)
  const hours = Math.floor(total / SECONDS_PER_HOUR)
  const minutes = Math.floor((total % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE)
  const rest = padClock(total % SECONDS_PER_MINUTE)
  if (hours === 0) return `${minutes}:${rest}`
  return `${hours}:${padClock(minutes)}:${rest}`
}

/** The average speed in km/h ("24.5") for a distance covered in a time, or a dash when no time has passed. */
export const formatAverageSpeed = (kilometres: number, seconds: number): string => {
  if (seconds <= 0) return NO_SPEED
  return ((kilometres * SECONDS_PER_HOUR) / seconds).toFixed(1)
}

/** The speed in km/h as a whole number ("24"), or a dash when the device gave none. */
export const formatCurrentSpeed = (metersPerSecond: number | null): string => {
  if (metersPerSecond === null) return NO_SPEED
  return String(Math.round(metersPerSecond * KILOMETRES_PER_HOUR_PER_METRE_PER_SECOND))
}
