'use client'

import { useModalDialog } from '@/hooks/useModalDialog'

const SAVE_TEXT =
  'Your track is saved as a new route with a temporary name, and the ride goes to your ride history.'
const NOTHING_TO_SAVE_TEXT = 'You have not moved yet, so there is no track to save.'

interface FinishFreeRideDialogProps {
  isOpen: boolean
  /** Whether a track was recorded that can be saved. */
  canSave: boolean
  isPending: boolean
  /** Why the ride could not be saved; the confirm button then leaves without saving. */
  error: string | null
  onKeepRiding: () => void
  onFinish: () => void
}

const getConfirmLabel = (canSave: boolean, error: string | null): string => {
  if (error) return 'Leave without saving'
  return canSave ? 'Finish ride' : 'Leave'
}

/** The guide's confirm dialog: finishing a free ride asks first, Keep riding before Finish. */
export default function FinishFreeRideDialog({
  isOpen,
  canSave,
  isPending,
  error,
  onKeepRiding,
  onFinish,
}: FinishFreeRideDialogProps) {
  const dialogRef = useModalDialog(isOpen)
  const confirmClass = `button ${canSave && !error ? 'button-primary' : 'button-error'}${
    isPending ? ' button-loading' : ''
  }`

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      role="alertdialog"
      aria-labelledby="finish-free-ride-title"
      aria-describedby="finish-free-ride-text"
      onClose={onKeepRiding}
    >
      <h2 className="text-subtitle" id="finish-free-ride-title">
        Finish this ride?
      </h2>
      <p className="text-small text-muted" id="finish-free-ride-text">
        {canSave ? SAVE_TEXT : NOTHING_TO_SAVE_TEXT}
      </p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button className="button button-outline" type="button" disabled={isPending} onClick={onKeepRiding}>
          Keep riding
        </button>
        <button
          className={confirmClass}
          type="button"
          disabled={isPending}
          aria-busy={isPending}
          onClick={onFinish}
        >
          {getConfirmLabel(canSave, error)}
        </button>
      </div>
    </dialog>
  )
}
