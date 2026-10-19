'use client'

import { useLeaveGroupOnExit } from '@/hooks/useLeaveGroupOnExit'
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

/** The ride of a group: ride mode on its route, or a free ride when it has none. Leaving it leaves the group. */
export default function GroupRideView({ group, onLeave, onFinish }: GroupRideViewProps) {
  const exit = useLeaveGroupOnExit({ groupId: group.id, onLeave, onFinish })

  if (group.route) return <RideModeView route={group.route} group={group} onQuit={exit.leave} onFinish={exit.finish} />
  return <FreeRideView group={group} onLeave={exit.leave} />
}
