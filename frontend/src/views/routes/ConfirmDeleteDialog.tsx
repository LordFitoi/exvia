'use client'

import { useModalDialog } from '@/hooks/useModalDialog'

interface ConfirmDeleteDialogProps {
  isOpen: boolean
  routeName: string
  isPending: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}

/** The guide's confirm dialog: a destructive action asks first, Cancel before Delete. */
export default function ConfirmDeleteDialog({
  isOpen,
  routeName,
  isPending,
  error,
  onCancel,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const dialogRef = useModalDialog(isOpen)
  const deleteClass = `button button-error${isPending ? ' button-loading' : ''}`

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      role="alertdialog"
      aria-labelledby="delete-route-title"
      aria-describedby="delete-route-text"
      onClose={onCancel}
    >
      <h2 className="text-subtitle" id="delete-route-title">
        Delete this route?
      </h2>
      <p className="text-small text-muted" id="delete-route-text">
        “{routeName}” will be deleted for good. This cannot be undone.
      </p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button className="button button-outline" type="button" disabled={isPending} onClick={onCancel}>
          Cancel
        </button>
        <button
          className={deleteClass}
          type="button"
          disabled={isPending}
          aria-busy={isPending}
          onClick={onConfirm}
        >
          Delete
        </button>
      </div>
    </dialog>
  )
}
