'use client'

import { useModalDialog } from '@/hooks/useModalDialog'
import { describeGroup, getGroupTitle } from '@/services/groupRules'
import type { RouteGroup } from '@/types/routeGroup'

interface ActiveGroupDialogProps {
  /** The group still rolling, or null while there is none to offer. */
  group: RouteGroup | null
  onJoin: () => void
  onStartAnother: () => void
  /** Esc: back to the setup, nothing started. */
  onDismiss: () => void
}

/** The guide's dialog: a group ride is still rolling, so join it again or ride with another one. */
export default function ActiveGroupDialog({ group, onJoin, onStartAnother, onDismiss }: ActiveGroupDialogProps) {
  const dialogRef = useModalDialog(group !== null)

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="active-group-dialog-title"
      aria-describedby="active-group-dialog-text"
      onClose={onDismiss}
    >
      <h2 className="text-subtitle" id="active-group-dialog-title">
        Join your group ride?
      </h2>
      <p className="text-small text-muted" id="active-group-dialog-text">
        {group && `${getGroupTitle(group)} is still rolling. ${describeGroup(group)}.`} Join it again, or ride with
        another group.
      </p>
      <div className="dialog-actions">
        <button className="button button-outline" type="button" onClick={onStartAnother}>
          Ride another
        </button>
        <button className="button button-primary" type="button" onClick={onJoin}>
          Join back
        </button>
      </div>
    </dialog>
  )
}
