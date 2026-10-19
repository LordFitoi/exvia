'use client'

import type { RouteGroup } from '@/types/routeGroup'
import FreeRideView from '@/views/ride/FreeRideView'
import RideModeView from '@/views/ride/RideModeView'

interface GroupRideViewProps {
  group: RouteGroup
  /** Leaves the ride without finishing it. */
  onLeave: () => void
  /** Leaves for good, after the ride was saved. */
  onFinish: () => void
}

/** The ride of a group: ride mode on its route, or a free ride when it has none. */
export default function GroupRideView({ group, onLeave, onFinish }: GroupRideViewProps) {
  if (group.route) return <RideModeView route={group.route} group={group} onQuit={onLeave} onFinish={onFinish} />
  return <FreeRideView group={group} onLeave={onLeave} onSaved={onFinish} />
}
