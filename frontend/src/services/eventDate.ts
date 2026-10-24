const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

/** "Sun, 25 Oct, 9:00 AM" in the reader's language and time zone. */
export const formatEventTime = (isoDateTime: string): string => dateTimeFormat.format(new Date(isoDateTime))

/** The day of the month, for the date block of a ride card. */
export const formatEventDay = (isoDateTime: string): string => String(new Date(isoDateTime).getDate())

/** The short month name, for the date block of a ride card. */
export const formatEventMonth = (isoDateTime: string): string =>
  new Date(isoDateTime).toLocaleDateString(undefined, { month: 'short' })
