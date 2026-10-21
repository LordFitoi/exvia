'use client'

import LiveGroupProvider from '@/context/LiveGroupProvider'
import { useLeaveGroupOnExit } from '@/hooks/useLeaveGroupOnExit'
import type { RouteGroup } from '@/types/routeGroup'
import GroupRideSession from '@/views/ride/GroupRideSession'

interface GroupRideViewProps {
  group: RouteGroup
  /** Leaves the ride. */
  onLeave: () => void
}

/** The ride of a group: ride mode on its route, or a free ride when it has none. Leaving it leaves the group. */
export default function GroupRideView({ group, onLeave }: GroupRideViewProps) {
  const leave = useLeaveGroupOnExit({ groupId: group.id, onLeave })

  return (
    <LiveGroupProvider key={group.id} initialGroup={group}>
      <GroupRideSession onLeave={leave} />
    </LiveGroupProvider>
  )
}
