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
