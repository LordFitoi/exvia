'use client'

import { useState } from 'react'

import { useConfirmedDeletion } from '@/hooks/useConfirmedDeletion'
import type { ConfirmedDeletion } from '@/hooks/useConfirmedDeletion'
import { removeRider } from '@/services/routeGroupApi'
import type { RiderProfile, RouteGroup } from '@/types/routeGroup'

const REMOVE_FAILED_MESSAGE = 'The rider could not be removed. Check your connection and try again.'

interface RiderRemoval extends ConfirmedDeletion {
  /** The rider the question is about; it stays set while the dialog closes. */
  readonly target: RiderProfile | null
  /** Opens the question for this rider. */
  readonly ask: (rider: RiderProfile) => void
}

/** The leader takes a rider out of the group in two steps: ask first, then remove. The group answered replaces the shown one. */
export const useRiderRemoval = (
  groupId: string,
  onRemoved: (group: RouteGroup) => void,
): RiderRemoval => {
  const [target, setTarget] = useState<RiderProfile | null>(null)
  const deletion = useConfirmedDeletion({
    targetId: target?.id ?? null,
    remove: async (riderId) => onRemoved(await removeRider(groupId, riderId)),
    failureMessage: REMOVE_FAILED_MESSAGE,
    onDeleted: () => undefined,
  })

  const ask = (rider: RiderProfile) => {
    setTarget(rider)
    deletion.requestDeletion()
  }

  return { ...deletion, target, ask }
}
