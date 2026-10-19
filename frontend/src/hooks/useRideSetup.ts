'use client'

import { useState } from 'react'

import { useMyRoutes } from '@/hooks/useMyRoutes'
import { useRouteDetail } from '@/hooks/useRouteDetail'
import type { RideSelection } from '@/types/rideSelection'
import type { RiderProfile } from '@/types/routeGroup'

type MyRoutes = ReturnType<typeof useMyRoutes>

interface RideSetup {
  myRoutes: MyRoutes
  /** The route or free mode to ride; null while the routes load, until the rider picks one. */
  selection: RideSelection | null
  /** The path of the selected route; idle in free mode. */
  detail: ReturnType<typeof useRouteDetail>
  invitees: readonly RiderProfile[]
  select: (selection: RideSelection) => void
  addInvitee: (rider: RiderProfile) => void
  removeInvitee: (riderId: number) => void
}

const FREE_SELECTION: RideSelection = { kind: 'free' }

/** The newest route, or free mode for a rider with no routes; nothing while that is not known yet. */
const getDefaultSelection = ({ status, routes }: MyRoutes): RideSelection | null => {
  if (status !== 'ready') return null
  return routes.length > 0 ? { kind: 'route', id: routes[0].id } : FREE_SELECTION
}

/** Everything the rider sets up before a ride: the routes, what to ride and who to invite. */
export const useRideSetup = (): RideSetup => {
  const myRoutes = useMyRoutes()
  const [chosen, setChosen] = useState<RideSelection | null>(null)
  const [invitees, setInvitees] = useState<readonly RiderProfile[]>([])
  const selection = chosen ?? getDefaultSelection(myRoutes)
  const detail = useRouteDetail(selection?.kind === 'route' ? selection.id : null)

  const addInvitee = (rider: RiderProfile) => setInvitees((previous) => [...previous, rider])
  const removeInvitee = (riderId: number) =>
    setInvitees((previous) => previous.filter((rider) => rider.id !== riderId))

  return { myRoutes, selection, detail, invitees, select: setChosen, addInvitee, removeInvitee }
}
