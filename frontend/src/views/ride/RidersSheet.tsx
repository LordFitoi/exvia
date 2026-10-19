'use client'

import { useId } from 'react'

import StateView from '@/components/feedback/StateView'
import RiderAvatar from '@/components/rider/RiderAvatar'
import { useModalDialog } from '@/hooks/useModalDialog'
import { MAX_GROUP_RIDERS } from '@/services/groupRules'
import type { RiderMarkerData } from '@/services/riderMarkers'
import type { GroupParticipant, ParticipantStatus, RiderProfile } from '@/types/routeGroup'

const STATUS_LABELS: Readonly<Record<ParticipantStatus, string>> = {
  invited: 'Invited',
  accepted: 'Not connected',
  rejected: 'Declined',
}

interface RidersSheetProps {
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
  onRemoveRider: (rider: RiderProfile) => void
  onClose: () => void
}

interface RiderRowProps {
  rider: RiderProfile
  /** What the row says under the name, such as "Invited". */
  meta?: string
  /** Centers the map on the rider; only riders on the map have it. */
  onFocus?: () => void
  /** Takes the rider out of the group; only the leader has it. */
  onRemove?: () => void
}

function RiderRow({ rider, meta, onFocus, onRemove }: RiderRowProps) {
  return (
    <li className="list-item">
      <RiderAvatar rider={rider} size="sm" />
      <span className="list-item-body">
        <span className="list-item-title">{rider.username}</span>
        {meta && <span className="list-item-meta">{meta}</span>}
      </span>
      {onFocus && (
        <button className="icon-button" type="button" aria-label={`Center the map on ${rider.username}`} onClick={onFocus}>
          <span className="icon icon-locate" aria-hidden="true"></span>
        </button>
      )}
      {onRemove && (
        <button className="icon-button" type="button" aria-label={`Remove ${rider.username}`} onClick={onRemove}>
          <span className="icon icon-x" aria-hidden="true"></span>
        </button>
      )}
    </li>
  )
}

/** A modal sheet with the riders of the ride: the connected ones can be found on the map, the leader invites and removes. Mount it to open it. */
export default function RidersSheet({
  connected,
  absent,
  canManage,
  canInvite,
  onFocusRider,
  onInvite,
  onRemoveRider,
  onClose,
}: RidersSheetProps) {
  const dialogRef = useModalDialog(true)
  const titleId = useId()
  const hasRiders = connected.length + absent.length > 0
  const removal = (rider: RiderProfile) => (canManage ? () => onRemoveRider(rider) : undefined)

  return (
    <dialog ref={dialogRef} className="sheet sheet-modal" aria-labelledby={titleId} onClose={onClose}>
      <span className="sheet-handle"></span>
      <div className="sheet-header">
        <h2 className="text-subtitle" id={titleId}>
          Riders
        </h2>
        <button className="icon-button" type="button" aria-label="Close Riders" onClick={onClose}>
          <span className="icon icon-x" aria-hidden="true"></span>
        </button>
      </div>
      {hasRiders ? (
        <ul className="list">
          {connected.map((rider) => (
            <RiderRow
              key={rider.id}
              rider={rider}
              meta="Connected"
              onFocus={() => onFocusRider(rider)}
              onRemove={removal(rider)}
            />
          ))}
          {absent.map((rider) => (
            <RiderRow key={rider.id} rider={rider} meta={STATUS_LABELS[rider.status]} onRemove={removal(rider)} />
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
