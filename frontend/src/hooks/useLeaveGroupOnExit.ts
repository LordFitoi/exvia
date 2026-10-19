'use client'

import { leaveRouteGroup } from '@/services/routeGroupApi'

interface LeaveGroupOnExitOptions {
  groupId: string
  /** Leaves the ride without finishing it. */
  onLeave: () => void
  /** Leaves for good, after the ride was saved. */
  onFinish: () => void
}

interface GroupExit {
  leave: () => void
  finish: () => void
}

/**
 * Leaving a ride takes the rider out of its group, so it is not offered back to them while the others
 * ride on. A failed request is only logged: it must never keep the rider on the ride screen.
 */
export const useLeaveGroupOnExit = ({ groupId, onLeave, onFinish }: LeaveGroupOnExitOptions): GroupExit => {
  const leaveGroup = () => {
    leaveRouteGroup(groupId).catch((error: unknown) => {
      console.error(`Could not leave the group ${groupId}`, error)
    })
  }

  return {
    leave: () => {
      leaveGroup()
      onLeave()
    },
    finish: () => {
      leaveGroup()
      onFinish()
    },
  }
}
