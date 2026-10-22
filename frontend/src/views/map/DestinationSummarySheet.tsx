'use client'

import FormAlert from '@/components/form/FormAlert'
import SheetHeader from '@/components/layout/SheetHeader'
import { useModalDialog } from '@/hooks/useModalDialog'
import { useSaveDestinationSummary } from '@/hooks/useSaveDestinationSummary'
import { formatAverageSpeed, formatClock, formatDistance, formatSpeed } from '@/services/formatRoute'
import type { NewDestinationSummary } from '@/types/rideSummary'

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
  summary: NewDestinationSummary
  /** Leaves the ride, back to the map, whether or not the summary was saved. */
  onClose: () => void
}

const MILLISECONDS_PER_SECOND = 1000

/**
 * Shown when the ride ends, at the place or when the rider quits on the way: the time it took, the
 * distance covered and the speeds. **Done** saves the ride on the server and then leaves; the X and Esc
 * leave without saving.
 */
export default function DestinationSummarySheet({ summary, onClose }: DestinationSummarySheetProps) {
  const { destinationName, startedAt, endedAt, isFinished, maxSpeed, kilometres } = summary
  const dialogRef = useModalDialog(true)
  const { isPending, error, save } = useSaveDestinationSummary({ summary, onSaved: onClose })
  const rideSeconds = (endedAt - startedAt) / MILLISECONDS_PER_SECOND

  return (
    <dialog
      ref={dialogRef}
      className="sheet sheet-modal"
      aria-labelledby="destination-summary-title"
      onClose={onClose}
    >
      <SheetHeader
        titleId="destination-summary-title"
        title={isFinished ? 'You’ve arrived!' : 'Ride ended'}
        closeLabel="Close without saving"
        sheetRef={dialogRef}
        onClose={onClose}
      />
      <p className="text-small text-muted">
        {isFinished ? `You rode to “${destinationName}”.` : `You stopped before reaching “${destinationName}”.`}
      </p>
      <div className="route-stats route-stats-pair">
        <RideStat value={formatClock(rideSeconds)} label="Time" />
        <RideStat value={formatDistance(kilometres)} label="Distance" />
        <RideStat value={formatAverageSpeed(kilometres, rideSeconds)} label="Avg km/h" />
        <RideStat value={formatSpeed(maxSpeed)} label="Max km/h" />
      </div>
      <FormAlert message={error} />
      <button
        className={`button button-primary button-lg button-block${isPending ? ' button-loading' : ''}`}
        type="button"
        disabled={isPending}
        aria-busy={isPending}
        onClick={save}
      >
        {error === null ? 'Done' : 'Try again'}
      </button>
    </dialog>
  )
}
