'use client'

import { useState } from 'react'

import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import { useAuth } from '@/hooks/useAuth'
import { useLiveGroup } from '@/hooks/useLiveGroup'
import { useRiderPromotion } from '@/hooks/useRiderPromotion'
import { useRiderRemoval } from '@/hooks/useRiderRemoval'
import { MAX_GROUP_RIDERS } from '@/services/groupRules'
import { inviteRider } from '@/services/routeGroupApi'
import type { RiderMarkerData } from '@/services/riderMarkers'
import type { Coordinates } from '@/types/geolocation'
import type { RiderProfile } from '@/types/routeGroup'
import InviteRiderDialog from '@/views/ride/InviteRiderDialog'
import RidersDialog from '@/views/ride/RidersDialog'

const INVITE_HINT = 'They get the invitation at once.'

interface RidersControlProps {
  /** The other riders connected to the ride, as drawn on the map. */
  riders: readonly RiderMarkerData[]
  /** Moves the map camera to a position. */
  onFocus: (position: Coordinates) => void
}

/**
 * The map button that lists the riders of the ride. Picking a connected one closes the list and centers
 * the map on them; the leader can also invite riders and remove them. The invite form takes the place of
 * the list while it is open, and the list comes back when the form closes.
 */
export default function RidersControl({ riders, onFocus }: RidersControlProps) {
  const { user } = useAuth()
  const { group, replaceGroup } = useLiveGroup()
  const [isOpen, setIsOpen] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const removal = useRiderRemoval(group.id, replaceGroup)
  const promotion = useRiderPromotion(group.id, replaceGroup)

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
      {isOpen && !isInviting && (
        <RidersDialog
          connected={riders}
          absent={absent}
          canManage={isLeader}
          canInvite={group.participants.length < MAX_GROUP_RIDERS}
          onFocusRider={handleFocusRider}
          onInvite={() => setIsInviting(true)}
          onPromoteRider={promotion.ask}
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
      <ConfirmDialog
        isOpen={promotion.isConfirming}
        title={`Make ${promotion.target?.username ?? 'this rider'} the leader?`}
        description="They will be able to change the route and to invite and remove riders. You stay in the ride as a rider."
        isPending={promotion.isPending}
        error={promotion.error}
        confirmLabel="Make leader"
        isDestructive={false}
        onCancel={promotion.cancel}
        onConfirm={promotion.confirm}
      />
      <ConfirmDialog
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
