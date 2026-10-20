'use client'

import { useId } from 'react'

import { useModalDialog } from '@/hooks/useModalDialog'

interface ConfirmDialogProps {
  isOpen: boolean
  /** The question, such as "Delete this route?". */
  title: string
  /** What will happen, and that it cannot be undone when it cannot. */
  description: string
  isPending: boolean
  error: string | null
  /** The confirming button; "Delete" unless the action has a better word, such as "Remove" or "Make leader". */
  confirmLabel?: string
  /** The confirming button is in the error color; false for an action that is not destructive. */
  isDestructive?: boolean
  onCancel: () => void
  onConfirm: () => void
}

/** The guide's confirm dialog: an action that cannot be taken back asks first, Cancel before the action. */
export default function ConfirmDialog({
  isOpen,
  title,
  description,
  isPending,
  error,
  confirmLabel = 'Delete',
  isDestructive = true,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const dialogRef = useModalDialog(isOpen)
  const titleId = useId()
  const descriptionId = useId()
  const confirmClass = `button ${isDestructive ? 'button-error' : 'button-primary'}${isPending ? ' button-loading' : ''}`

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onCancel}
    >
      <h2 className="text-subtitle" id={titleId}>
        {title}
      </h2>
      <p className="text-small text-muted" id={descriptionId}>
        {description}
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
          className={confirmClass}
          type="button"
          disabled={isPending}
          aria-busy={isPending}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
