'use client'

import SheetHeader from '@/components/layout/SheetHeader'
import { useModalDialog } from '@/hooks/useModalDialog'
import { formatAverageSpeed, formatClock, formatDistance, formatSpeed } from '@/services/formatRoute'

interface RideStatProps {
  value: string
  label: string
}

function RideStat({ value, label }: RideStatProps) {
  return (
    <div className="route-stat">
      <span className="route-stat-value data">{value}</span>
      <span className="text-caption">{label}</span>
    </div>
  )
}

interface DestinationSummarySheetProps {
  /** The place the rider arrived at. */
  placeName: string
  /** How long the ride took, in seconds. */
  rideSeconds: number
  /** The kilometres the rider covered. */
  kilometres: number
  /** The top speed of the ride in km/h, or null when the device gave none. */
  maxSpeed: number | null
  /** Closes the summary and leaves the ride, back to the map. */
  onClose: () => void
}

/** Shown when the rider reaches the place: the time it took, the distance covered and the speeds. Nothing of it is saved. */
export default function DestinationSummarySheet({
  placeName,
  rideSeconds,
  kilometres,
  maxSpeed,
  onClose,
}: DestinationSummarySheetProps) {
  const dialogRef = useModalDialog(true)

  return (
    <dialog
      ref={dialogRef}
      className="sheet sheet-modal"
      aria-labelledby="destination-summary-title"
      onClose={onClose}
    >
      <SheetHeader
        titleId="destination-summary-title"
        title="You’ve arrived!"
        closeLabel="Close summary"
        sheetRef={dialogRef}
        onClose={onClose}
      />
      <p className="text-small text-muted">You rode to “{placeName}”.</p>
      <div className="route-stats">
        <RideStat value={formatClock(rideSeconds)} label="Time" />
        <RideStat value={formatDistance(kilometres)} label="Distance" />
        <RideStat value={formatAverageSpeed(kilometres, rideSeconds)} label="Avg km/h" />
        <RideStat value={formatSpeed(maxSpeed)} label="Max km/h" />
      </div>
      <button className="button button-primary button-lg button-block" type="button" onClick={onClose}>
        Done
      </button>
    </dialog>
  )
}
