'use client'

import { useState } from 'react'

import { useAuth } from '@/hooks/useAuth'
import { useLiveGroup } from '@/hooks/useLiveGroup'
import type { Coordinates } from '@/types/geolocation'
import ChangeRouteDialog from '@/views/ride/ChangeRouteDialog'

interface ChangeRouteControlProps {
  /** Where the leader is now, so the route they draw starts there; null while there is no position. */
  rider: Coordinates | null
}

/** The map button that lets the leader change the route, or go to free mode, at any moment of the ride. Others do not see it. */
export default function ChangeRouteControl({ rider }: ChangeRouteControlProps) {
  const { user } = useAuth()
  const { group } = useLiveGroup()
  const [isOpen, setIsOpen] = useState(false)

  if (group.author.id !== user?.id) return null

  return (
    <>
      <button className="icon-button" type="button" aria-label="Change route" onClick={() => setIsOpen(true)}>
        <span className="icon icon-route" aria-hidden="true"></span>
      </button>
      {isOpen && <ChangeRouteDialog rider={rider} onClose={() => setIsOpen(false)} />}
    </>
  )
}
