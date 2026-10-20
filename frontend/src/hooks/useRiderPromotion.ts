'use client'

import { useState } from 'react'

import { useConfirmedDeletion } from '@/hooks/useConfirmedDeletion'
import type { ConfirmedDeletion } from '@/hooks/useConfirmedDeletion'
import { promoteRider } from '@/services/routeGroupApi'
import type { RiderProfile, RouteGroup } from '@/types/routeGroup'

const PROMOTE_FAILED_MESSAGE = 'The rider could not be made leader. Check your connection and try again.'

interface RiderPromotion extends ConfirmedDeletion {
  /** The rider the question is about; it stays set while the dialog closes. */
  readonly target: RiderProfile | null
  /** Opens the question for this rider. */
  readonly ask: (rider: RiderProfile) => void
}

/**
 * The leader hands the group to a rider in two steps: ask first, then promote. The group answered
 * replaces the shown one, and the promoted rider leads it from then on. It reuses the ask-then-confirm
 * steps of `useConfirmedDeletion`, which do not depend on what is being confirmed.
 */
export const useRiderPromotion = (
  groupId: string,
  onPromoted: (group: RouteGroup) => void,
): RiderPromotion => {
  const [target, setTarget] = useState<RiderProfile | null>(null)
  const confirmation = useConfirmedDeletion({
    targetId: target?.id ?? null,
    remove: async (riderId) => onPromoted(await promoteRider(groupId, riderId)),
    failureMessage: PROMOTE_FAILED_MESSAGE,
    onDeleted: () => undefined,
  })

  const ask = (rider: RiderProfile) => {
    setTarget(rider)
    confirmation.requestDeletion()
  }

  return { ...confirmation, target, ask }
}
