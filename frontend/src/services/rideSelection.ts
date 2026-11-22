import type { RideSelection } from '@/types/rideSelection'
import type { NewRouteGroup, RouteGroup } from '@/types/routeGroup'

/** The route and mode the server needs to ride `selection`; with none yet it is plain free mode. */
export const toRouteChoice = (selection: RideSelection | null): Pick<NewRouteGroup, 'routeId' | 'isTrack'> => ({
  routeId: selection?.kind === 'route' ? selection.id : null,
  isTrack: selection?.kind === 'track',
})

/** What a group rides now, as the picker shows it. */
export const getGroupSelection = ({ route, isTrack }: RouteGroup): RideSelection => {
  if (route) return { kind: 'route', id: route.id }
  return { kind: isTrack ? 'track' : 'free' }
}

export const isSameSelection = (first: RideSelection, second: RideSelection): boolean => {
  if (first.kind === 'route' && second.kind === 'route') return first.id === second.id
  return first.kind === second.kind
}
