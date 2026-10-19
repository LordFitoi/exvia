'use client'

import { useState } from 'react'

import { fetchActiveGroup } from '@/services/routeGroupApi'
import type { NewRouteGroup, RouteGroup } from '@/types/routeGroup'

interface ActiveGroupPromptOptions {
  /** Takes the rider back into the group that is still rolling. */
  onJoin: (group: RouteGroup) => void
  /** Starts the ride the rider set up. */
  onStart: (request: NewRouteGroup) => void
}

interface Offer {
  readonly group: RouteGroup
  readonly request: NewRouteGroup
}

interface ActiveGroupPrompt {
  /** The group offered to the rider, or null while no question is open. */
  readonly offeredGroup: RouteGroup | null
  readonly isChecking: boolean
  /** Starts `request`, unless a group is still rolling: then the rider is asked first. */
  requestRide: (request: NewRouteGroup) => Promise<void>
  join: () => void
  startAnother: () => void
  dismiss: () => void
}

/** Asks the rider to join the group that is still rolling before a new one is created. */
export const useActiveGroupPrompt = ({ onJoin, onStart }: ActiveGroupPromptOptions): ActiveGroupPrompt => {
  const [offer, setOffer] = useState<Offer | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const requestRide = async (request: NewRouteGroup) => {
    setIsChecking(true)
    try {
      const group = await fetchActiveGroup()
      if (group) setOffer({ group, request })
      else onStart(request)
    } catch (error) {
      // Not knowing must not stop the rider: starting reports its own connection problems.
      console.error('Could not check for an active group', error)
      onStart(request)
    } finally {
      setIsChecking(false)
    }
  }

  const join = () => {
    if (offer) onJoin(offer.group)
  }

  const startAnother = () => {
    setOffer(null)
    if (offer) onStart(offer.request)
  }

  const dismiss = () => setOffer(null)

  return { offeredGroup: offer?.group ?? null, isChecking, requestRide, join, startAnother, dismiss }
}
