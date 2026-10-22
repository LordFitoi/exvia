import type { RideSummaryListItem } from '@/types/rideSummary'

/**
 * Whether the `distance` of a ride says how far the rider went. A ride of a route that was quit early
 * carries the route's whole length, which says nothing; a ride to a place carries the kilometres covered.
 */
export const isDistanceCovered = ({ is_finished, route_type }: Pick<RideSummaryListItem, 'is_finished' | 'route_type'>): boolean =>
  is_finished || route_type === 'destination'
