'use client'

import { useId, useState } from 'react'

import StateView from '@/components/feedback/StateView'
import ModalHeader from '@/components/layout/ModalHeader'
import { useModalDialog } from '@/hooks/useModalDialog'
import { MAX_GROUP_RIDERS } from '@/services/groupRules'
import type { RiderMarkerData } from '@/services/riderMarkers'
import type { GroupParticipant, ParticipantStatus, RiderProfile } from '@/types/routeGroup'
import RiderRow from '@/views/ride/RiderRow'

const STATUS_LABELS: Readonly<Record<ParticipantStatus, string>> = {
  invited: 'Invited',
  accepted: 'Not connected',
  rejected: 'Declined',
}

interface RidersDialogProps {
  /** The other riders connected now, as drawn on the map. */
  connected: readonly RiderMarkerData[]
  /** The other riders of the group who are not connected: invited, or riding but quiet. */
  absent: readonly GroupParticipant[]
  /** True for the leader, who can invite and remove riders. */
  canManage: boolean
  /** False once the group is full. */
  canInvite: boolean
  onFocusRider: (rider: RiderMarkerData) => void
  onInvite: () => void
  onPromoteRider: (rider: RiderProfile) => void
  onRemoveRider: (rider: RiderProfile) => void
  onClose: () => void
}

/** A centered dialog with the riders of the ride: the connected ones can be found on the map, the leader invites and removes. Mount it to open it. */
export default function RidersDialog({
  connected,
  absent,
  canManage,
  canInvite,
  onFocusRider,
  onInvite,
  onPromoteRider,
  onRemoveRider,
  onClose,
}: RidersDialogProps) {
  const dialogRef = useModalDialog(true)
  const titleId = useId()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const hasRiders = connected.length + absent.length > 0
  const rowProps = (rider: RiderProfile, canLead: boolean) => ({
    onPromote: canManage && canLead ? () => onPromoteRider(rider) : undefined,
    onRemove: canManage ? () => onRemoveRider(rider) : undefined,
    isSelected: selectedId === rider.id,
    onToggleSelected: () => setSelectedId(selectedId === rider.id ? null : rider.id),
  })

  return (
    <dialog ref={dialogRef} className="dialog dialog-panel" aria-labelledby={titleId} onClose={onClose}>
      <ModalHeader titleId={titleId} title="Riders" closeLabel="Close Riders" onClose={onClose} />
      {hasRiders ? (
        <ul className="list list-flat">
          {connected.map((rider) => (
            <RiderRow
              key={rider.id}
              rider={rider}
              meta="Connected"
              onFocus={() => onFocusRider(rider)}
              {...rowProps(rider, true)}
            />
          ))}
          {absent.map((rider) => (
            <RiderRow key={rider.id} rider={rider} meta={STATUS_LABELS[rider.status]} {...rowProps(rider, rider.status === 'accepted')} />
          ))}
        </ul>
      ) : (
        <StateView title="Nobody else is here" description="Riders of your group show up here while they are connected.">
          <span className="icon icon-lg icon-users"></span>
        </StateView>
      )}
      {canManage && canInvite && (
        <button className="button button-outline button-block" type="button" onClick={onInvite}>
          <span className="icon icon-plus" aria-hidden="true"></span>Invite a rider
        </button>
      )}
      {canManage && !canInvite && (
        <p className="text-small text-muted">A group has at most {MAX_GROUP_RIDERS} riders, you included.</p>
      )}
    </dialog>
  )
}
