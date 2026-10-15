import type { SaveRideStatus } from '@/hooks/useSaveRideSummary'

interface RideSaveStatusProps {
  status: SaveRideStatus
  onRetry: () => void
}

/** Tells the rider whether the finished ride reached the server, with a retry when it did not. */
export default function RideSaveStatus({ status, onRetry }: RideSaveStatusProps) {
  if (status === 'failed') {
    return (
      <div className="stack">
        <p className="field-error" role="alert">
          Could not save your ride.
        </p>
        <button className="button button-outline" type="button" onClick={onRetry}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <p className="text-small text-muted" role="status">
      {status === 'saved' ? 'Ride saved.' : 'Saving your ride…'}
    </p>
  )
}
