'use client'

import CheckpointTimes from '@/components/route/CheckpointTimes'
import type { CheckpointTimesProps } from '@/components/route/CheckpointTimes'
import SheetHeader from '@/components/layout/SheetHeader'
import { useModalDialog } from '@/hooks/useModalDialog'
import { formatAverageSpeed, formatClock, formatDistance, formatDuration } from '@/services/formatRoute'
import type { SaveRideStatus } from '@/hooks/useSaveRideSummary'
import RideSaveStatus from '@/views/ride/RideSaveStatus'
import type { RideRoute } from '@/types/route'

interface RideSummarySheetProps {
  isOpen: boolean
  route: RideRoute
  /** How long the ride took, in seconds. */
  rideSeconds: number
  /** The checkpoints of the route and when each was reached. */
  checkpoints: CheckpointTimesProps
  /** Whether the ride has been saved on the server. */
  saveStatus: SaveRideStatus
  /** Tries to save the ride again after a failure. */
  onRetrySave: () => void
  /** Closes the summary; the rider stays on the map and in the ride. */
  onClose: () => void
}

/** Shown when the rider reaches the finish: the time it took, the distance, the average speed and the checkpoints with when each was reached. */
export default function RideSummarySheet({
  isOpen,
  route,
  rideSeconds,
  checkpoints,
  saveStatus,
  onRetrySave,
  onClose,
}: RideSummarySheetProps) {
  const dialogRef = useModalDialog(isOpen)

  return (
    <dialog
      ref={dialogRef}
      className="sheet sheet-modal"
      aria-labelledby="ride-summary-title"
      onClose={onClose}
    >
      <SheetHeader
        titleId="ride-summary-title"
        title="You’ve arrived!"
        closeLabel="Close summary"
        sheetRef={dialogRef}
        onClose={onClose}
      />
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
      <CheckpointTimes {...checkpoints} />
      <RideSaveStatus status={saveStatus} onRetry={onRetrySave} />
      <button className="button button-primary button-lg button-block" type="button" onClick={onClose}>
        Done
      </button>
    </dialog>
  )
}
