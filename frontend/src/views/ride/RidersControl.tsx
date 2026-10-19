'use client'

import { useState } from 'react'

import ConfirmDeleteDialog from '@/components/feedback/ConfirmDeleteDialog'
import { useAuth } from '@/hooks/useAuth'
import { useLiveGroup } from '@/hooks/useLiveGroup'
import { useRiderRemoval } from '@/hooks/useRiderRemoval'
import { MAX_GROUP_RIDERS } from '@/services/groupRules'
import { inviteRider } from '@/services/routeGroupApi'
import type { RiderMarkerData } from '@/services/riderMarkers'
import type { Coordinates } from '@/types/geolocation'
import type { RiderProfile } from '@/types/routeGroup'
import InviteRiderDialog from '@/views/ride/InviteRiderDialog'
import RidersSheet from '@/views/ride/RidersSheet'

const INVITE_HINT = 'They get the invitation at once.'

interface RidersControlProps {
  /** The other riders connected to the ride, as drawn on the map. */
  riders: readonly RiderMarkerData[]
  /** Moves the map camera to a position. */
  onFocus: (position: Coordinates) => void
}

/**
 * The map button that lists the riders of the ride. Picking a connected one closes the list and centers
 * the map on them; the leader can also invite riders and remove them.
 */
export default function RidersControl({ riders, onFocus }: RidersControlProps) {
  const { user } = useAuth()
  const { group, replaceGroup } = useLiveGroup()
  const [isOpen, setIsOpen] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const removal = useRiderRemoval(group.id, replaceGroup)

  const connectedIds = new Set(riders.map(({ id }) => id))
  const absent = group.participants.filter(({ id }) => id !== user?.id && !connectedIds.has(id))
  const isLeader = group.author.id === user?.id

  const handleFocusRider = (rider: RiderMarkerData) => {
    setIsOpen(false)
    onFocus(rider.position)
  }

  const handleInvited = async (rider: RiderProfile) => {
    replaceGroup(await inviteRider(group.id, rider.username))
    setIsInviting(false)
  }

  return (
    <>
      <button className="icon-button" type="button" aria-label="Riders" onClick={() => setIsOpen(true)}>
        <span className="icon icon-users" aria-hidden="true"></span>
      </button>
      {isOpen && (
        <RidersSheet
          connected={riders}
          absent={absent}
          canManage={isLeader}
          canInvite={group.participants.length < MAX_GROUP_RIDERS}
          onFocusRider={handleFocusRider}
          onInvite={() => setIsInviting(true)}
          onRemoveRider={removal.ask}
          onClose={() => setIsOpen(false)}
        />
      )}
      {isInviting && (
        <InviteRiderDialog
          ownUsername={group.author.username}
          invitees={group.participants}
          hint={INVITE_HINT}
          onClose={() => setIsInviting(false)}
          onAdded={handleInvited}
        />
      )}
      <ConfirmDeleteDialog
        isOpen={removal.isConfirming}
        title={`Remove ${removal.target?.username ?? 'this rider'}?`}
        description="They are taken out of the ride and stop sharing their position. You can invite them again."
        isPending={removal.isPending}
        error={removal.error}
        confirmLabel="Remove"
        onCancel={removal.cancel}
        onConfirm={removal.confirm}
      />
    </>
  )
}
