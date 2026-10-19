'use client'

import { useModalDialog } from '@/hooks/useModalDialog'

interface FinishFreeRideDialogProps {
  isOpen: boolean
  onKeepRiding: () => void
  onFinish: () => void
}

/** The guide's confirm dialog: finishing a free ride asks first, Keep riding before Finish. */
export default function FinishFreeRideDialog({ isOpen, onKeepRiding, onFinish }: FinishFreeRideDialogProps) {
  const dialogRef = useModalDialog(isOpen)

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
        A free ride is not recorded, so nothing is saved.
      </p>
      <div className="dialog-actions">
        <button className="button button-outline" type="button" onClick={onKeepRiding}>
          Keep riding
        </button>
        <button className="button button-primary" type="button" onClick={onFinish}>
          Finish ride
        </button>
      </div>
    </dialog>
  )
}
