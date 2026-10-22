import type { RouteType } from '@/types/rideSummary'

interface RideMode {
  /** The name of the mode, as the summary's flag reads it. */
  readonly label: string
  readonly iconClass: string
  readonly badgeClass: string
}

/** How the history tells the two kinds of ride apart: a ride of a saved route, and a ride to a place. */
export const RIDE_MODES: Readonly<Record<RouteType, RideMode>> = {
  ride: { label: 'Ride mode', iconClass: 'icon-flag-checkered', badgeClass: 'badge-primary' },
  destination: { label: 'Destination mode', iconClass: 'icon-pin', badgeClass: 'badge-info' },
}
