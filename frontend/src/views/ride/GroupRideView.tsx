'use client'

import LiveGroupProvider from '@/context/LiveGroupProvider'
import { useLeaveGroupOnExit } from '@/hooks/useLeaveGroupOnExit'
import type { RouteGroup } from '@/types/routeGroup'
import GroupRideSession from '@/views/ride/GroupRideSession'

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

  return (
    <LiveGroupProvider key={group.id} initialGroup={group}>
      <GroupRideSession onLeave={exit.leave} onFinish={exit.finish} />
    </LiveGroupProvider>
  )
}
