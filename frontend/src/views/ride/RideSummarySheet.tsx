'use client'

import { useModalDialog } from '@/hooks/useModalDialog'
import { formatAverageSpeed, formatClock, formatDistance, formatDuration } from '@/services/formatRoute'
import type { SaveRideStatus } from '@/hooks/useSaveRideSummary'
import RideSaveStatus from '@/views/ride/RideSaveStatus'
import type { RouteDetail } from '@/types/route'

interface RideSummarySheetProps {
  isOpen: boolean
  route: RouteDetail
  /** How long the ride took, in seconds. */
  rideSeconds: number
  /** Whether the ride has been saved on the server. */
  saveStatus: SaveRideStatus
  /** Tries to save the ride again after a failure. */
  onRetrySave: () => void
  /** Closes the summary and stays on the map. */
  onClose: () => void
  /** Ends the ride and leaves ride mode. */
  onDone: () => void
}

/** Shown when the rider reaches the finish: the time it took, the distance and the average speed. */
export default function RideSummarySheet({
  isOpen,
  route,
  rideSeconds,
  saveStatus,
  onRetrySave,
  onClose,
  onDone,
}: RideSummarySheetProps) {
  const dialogRef = useModalDialog(isOpen)

  return (
    <dialog
      ref={dialogRef}
      className="sheet sheet-modal"
      aria-labelledby="ride-summary-title"
      onClose={onClose}
    >
      <span className="sheet-handle"></span>
      <div className="sheet-header">
        <h2 className="text-subtitle" id="ride-summary-title">
          You’ve arrived!
        </h2>
        <button className="icon-button" type="button" aria-label="Close summary" onClick={onClose}>
          <span className="icon icon-x" aria-hidden="true"></span>
        </button>
      </div>
      <p className="text-small text-muted">You finished “{route.name}”.</p>
      <div className="route-stats">
        <div className="route-stat">
          <span className="route-stat-value data">{formatClock(rideSeconds)}</span>
          <span className="text-caption">Time</span>
        </div>
        <div className="route-stat">
          <span className="route-stat-value data">{formatDistance(route.distance)}</span>
          <span className="text-caption">Distance</span>
        </div>
        <div className="route-stat">
          <span className="route-stat-value data">{formatAverageSpeed(route.distance, rideSeconds)}</span>
          <span className="text-caption">Avg km/h</span>
        </div>
      </div>
      <p className="text-small text-muted">Estimated time was {formatDuration(route.estimated_time)}.</p>
      <RideSaveStatus status={saveStatus} onRetry={onRetrySave} />
      <button className="button button-primary button-lg button-block" type="button" onClick={onDone}>
        Done
      </button>
    </dialog>
  )
}
