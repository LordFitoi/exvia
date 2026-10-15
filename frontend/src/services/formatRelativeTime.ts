const MS_PER_MINUTE = 60_000
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const DAYS_BEFORE_DATE = 7

const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' })

/** "5 min. ago", "3 hr. ago", "2 days ago" for the first week, then the date such as "15 Oct 2026". */
export const formatRelativeTime = (isoDateTime: string, now: number = Date.now()): string => {
  const minutes = Math.min(0, Math.round((new Date(isoDateTime).getTime() - now) / MS_PER_MINUTE))
  const hours = Math.trunc(minutes / MINUTES_PER_HOUR)
  const days = Math.trunc(hours / HOURS_PER_DAY)
  if (Math.abs(days) >= DAYS_BEFORE_DATE) {
    return new Date(isoDateTime).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  }
  if (days !== 0) return relativeFormat.format(days, 'day')
  if (hours !== 0) return relativeFormat.format(hours, 'hour')
  return relativeFormat.format(minutes, 'minute')
}
