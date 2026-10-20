'use client'

import { useId } from 'react'

import LoadFailedState from '@/components/feedback/LoadFailedState'
import StateView from '@/components/feedback/StateView'
import RiderAvatar from '@/components/rider/RiderAvatar'
import { useModalDialog } from '@/hooks/useModalDialog'
import type { usePushNotifications } from '@/hooks/usePushNotifications'
import type { useRouteInvitationAnswer } from '@/hooks/useRouteInvitationAnswer'
import type { useRouteInvitations } from '@/hooks/useRouteInvitations'
import { formatRelativeTime } from '@/services/formatRelativeTime'
import type { RouteInvitation } from '@/types/notification'
import PushNotificationsRow from '@/views/home/PushNotificationsRow'

const FREE_MODE_LABEL = 'Free mode'
const ANSWERED_BADGES = {
  accepted: { label: 'Accepted', className: 'badge badge-success' },
  rejected: { label: 'Rejected', className: 'badge' },
  expired: { label: 'Expired', className: 'badge' },
} as const

interface NotificationsSheetProps {
  invitations: ReturnType<typeof useRouteInvitations>
  answer: ReturnType<typeof useRouteInvitationAnswer>
  push: ReturnType<typeof usePushNotifications>
  onClose: () => void
}

interface InvitationRowProps {
  invitation: RouteInvitation
  answer: ReturnType<typeof useRouteInvitationAnswer>
}

function InvitationRow({ invitation, answer }: InvitationRowProps) {
  const { author, route_group: groupId, route_name: routeName, status, created_at: createdAt } = invitation
  const isPending = answer.pendingGroupId === groupId
  const isBusy = answer.pendingGroupId !== null

  return (
    <li className="list-item list-item-stacked">
      <RiderAvatar rider={author} />
      <span className="list-item-body">
        <span className="list-item-title">{author.username} invited you</span>
        <span className="list-item-meta">
          {routeName ?? FREE_MODE_LABEL} · {formatRelativeTime(createdAt)}
        </span>
      </span>
      {status === 'invited' ? (
        <div className="button-row button-row-even">
          <button
            className="button button-outline button-sm"
            type="button"
            disabled={isBusy}
            onClick={() => answer.reject(groupId)}
          >
            Reject
          </button>
          <button
            className={`button button-primary button-sm${isPending ? ' button-loading' : ''}`}
            type="button"
            disabled={isBusy}
            aria-busy={isPending}
            onClick={() => answer.accept(groupId)}
          >
            Accept
          </button>
        </div>
      ) : (
        <span className={ANSWERED_BADGES[status].className}>{ANSWERED_BADGES[status].label}</span>
      )}
    </li>
  )
}

/** A modal sheet with the invitations to ride; accepting one starts the ride at once. Mount it to open it. */
export default function NotificationsSheet({ invitations, answer, push, onClose }: NotificationsSheetProps) {
  const dialogRef = useModalDialog(true)
  const titleId = useId()
  const { status, invitations: items } = invitations

  return (
    <dialog ref={dialogRef} className="sheet sheet-modal" aria-labelledby={titleId} onClose={onClose}>
      <span className="sheet-handle"></span>
      <div className="sheet-header">
        <h2 className="text-subtitle" id={titleId}>
          Notifications
        </h2>
        <button className="icon-button" type="button" aria-label="Close Notifications" onClick={onClose}>
          <span className="icon icon-x" aria-hidden="true"></span>
        </button>
      </div>
      <PushNotificationsRow push={push} />
      {answer.error && (
        <p className="field-error" role="alert">
          {answer.error}
        </p>
      )}
      {status === 'failed' && <LoadFailedState title="Could not load your notifications" onRetry={invitations.reload} />}
      {status === 'loading' && (
        <p className="text-small text-muted" role="status">
          Loading…
        </p>
      )}
      {status === 'ready' && items.length === 0 && (
        <StateView title="Nothing new" description="Invitations to ride together show up here.">
          <span className="icon icon-lg icon-bell"></span>
        </StateView>
      )}
      {items.length > 0 && (
        <ul className="list">
          {items.map((invitation) => (
            <InvitationRow key={invitation.id} invitation={invitation} answer={answer} />
          ))}
        </ul>
      )}
    </dialog>
  )
}
