'use client'

import { useModalDialog } from '@/hooks/useModalDialog'

interface ConfirmQuitRideDialogProps {
  isOpen: boolean
  isPending: boolean
  /** Why the ride could not be saved; the Quit button then reads "Quit anyway". */
  error: string | null
  onKeepRiding: () => void
  onQuit: () => void
}

/** The guide's confirm dialog: leaving a ride in progress asks first, Keep riding before Quit. */
export default function ConfirmQuitRideDialog({
  isOpen,
  isPending,
  error,
  onKeepRiding,
  onQuit,
}: ConfirmQuitRideDialogProps) {
  const dialogRef = useModalDialog(isOpen)
  const quitClass = `button button-error${isPending ? ' button-loading' : ''}`

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      role="alertdialog"
      aria-labelledby="quit-ride-title"
      aria-describedby="quit-ride-text"
      onClose={onKeepRiding}
    >
      <h2 className="text-subtitle" id="quit-ride-title">
        Quit this ride?
      </h2>
      <p className="text-small text-muted" id="quit-ride-text">
        The ride so far is saved to your ride history, marked as not finished.
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
          className={quitClass}
          type="button"
          disabled={isPending}
          aria-busy={isPending}
          onClick={onQuit}
        >
          {error ? 'Quit anyway' : 'Quit ride'}
        </button>
      </div>
    </dialog>
  )
}
