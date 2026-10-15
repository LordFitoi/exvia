'use client'

import { useId } from 'react'

import { useModalDialog } from '@/hooks/useModalDialog'

interface ConfirmDeleteDialogProps {
  isOpen: boolean
  /** The question, such as "Delete this route?". */
  title: string
  /** What will be deleted and that it cannot be undone. */
  description: string
  isPending: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}

/** The guide's confirm dialog: a destructive action asks first, Cancel before Delete. */
export default function ConfirmDeleteDialog({
  isOpen,
  title,
  description,
  isPending,
  error,
  onCancel,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const dialogRef = useModalDialog(isOpen)
  const titleId = useId()
  const descriptionId = useId()
  const deleteClass = `button button-error${isPending ? ' button-loading' : ''}`

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
