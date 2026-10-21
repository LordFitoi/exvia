'use client'

import { leaveRouteGroup } from '@/services/routeGroupApi'

interface LeaveGroupOnExitOptions {
  groupId: string
  /** Leaves the ride screen. */
  onLeave: () => void
}

/**
 * Leaving a ride takes the rider out of its group, so it is not offered back to them while the others
 * ride on. A failed request is only logged: it must never keep the rider on the ride screen. Finishing
 * the route is not leaving: the rider stays in the group until they leave it.
 */
export const useLeaveGroupOnExit = ({ groupId, onLeave }: LeaveGroupOnExitOptions): (() => void) => {
  return () => {
    leaveRouteGroup(groupId).catch((error: unknown) => {
      console.error(`Could not leave the group ${groupId}`, error)
    })
    onLeave()
  }
}
