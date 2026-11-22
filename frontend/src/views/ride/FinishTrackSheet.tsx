'use client'

import FormAlert from '@/components/form/FormAlert'
import SheetHeader from '@/components/layout/SheetHeader'
import { useModalDialog } from '@/hooks/useModalDialog'
import { useSaveTrack } from '@/hooks/useSaveTrack'
import { formatAverageSpeed, formatClock, formatDistance, formatSpeed } from '@/services/formatRoute'
import { MIN_TRACK_METERS, getTrackRouteName } from '@/services/trackRoute'
import type { TrackPoint } from '@/types/track'

const MILLISECONDS_PER_SECOND = 1000
const METERS_PER_KILOMETER = 1000

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

interface FinishTrackSheetProps {
  groupId: string
  /** The path ridden, as it was when the rider asked to finish. */
  track: readonly TrackPoint[]
  /** When the ride began and when the rider asked to finish it, in milliseconds since the epoch. */
  startedAt: number
  endedAt: number
  maxSpeed: number | null
  kilometres: number
  /** Closes the sheet and goes on riding. */
  onKeepRiding: () => void
  /** Leaves the ride, whether or not the track was saved. */
  onLeave: () => void
}

/**
 * Asks to finish a track ride and shows how it went. **Save track** turns the path into a route and saves the
 * ride in the history, then leaves. A ride too short for a track can only be left, and a save that failed can be
 * tried again or left without saving, so a bad connection never traps the rider.
 */
export default function FinishTrackSheet({
  groupId,
  track,
  startedAt,
  endedAt,
  maxSpeed,
  kilometres,
  onKeepRiding,
  onLeave,
}: FinishTrackSheetProps) {
  const dialogRef = useModalDialog(true)
  const { isPending, progress, error, save } = useSaveTrack({ groupId, startedAt, endedAt, maxSpeed, track, onSaved: onLeave })
  const rideSeconds = (endedAt - startedAt) / MILLISECONDS_PER_SECOND
  const isLongEnough = kilometres * METERS_PER_KILOMETER >= MIN_TRACK_METERS

  const handleKeepRiding = () => {
    if (!isPending) onKeepRiding()
  }

  return (
    <dialog
      ref={dialogRef}
      className="sheet sheet-modal"
      aria-labelledby="finish-track-title"
      onCancel={(event) => isPending && event.preventDefault()}
      onClose={handleKeepRiding}
    >
      <SheetHeader
        titleId="finish-track-title"
        title="Finish this track?"
        closeLabel="Keep riding"
        sheetRef={dialogRef}
        onClose={handleKeepRiding}
      />
      <p className="text-small text-muted">
        {isLongEnough
          ? `Your path is saved as the route “${getTrackRouteName(endedAt)}”, and the ride goes to your history.`
          : 'You have not gone far enough to make a route of it, so nothing can be saved.'}
      </p>
      <div className="route-stats route-stats-pair">
        <RideStat value={formatClock(rideSeconds)} label="Time" />
        <RideStat value={formatDistance(kilometres)} label="Distance" />
        <RideStat value={formatAverageSpeed(kilometres, rideSeconds)} label="Avg km/h" />
        <RideStat value={formatSpeed(maxSpeed)} label="Max km/h" />
      </div>
      <FormAlert message={error} />
      {progress && (
        <p className="text-small text-muted" role="status">
          {progress}
        </p>
      )}
      <div className="button-row button-row-even">
        <button className="button button-outline" type="button" disabled={isPending} onClick={onKeepRiding}>
          Keep riding
        </button>
        {isLongEnough ? (
          <button
            className={`button button-primary${isPending ? ' button-loading' : ''}`}
            type="button"
            disabled={isPending}
            aria-busy={isPending}
            onClick={save}
          >
            {error === null ? 'Save track' : 'Try again'}
          </button>
        ) : (
          <button className="button button-primary" type="button" onClick={onLeave}>
            Leave ride
          </button>
        )}
      </div>
      {error !== null && (
        <button className="link-action" type="button" disabled={isPending} onClick={onLeave}>
          Leave without saving
        </button>
      )}
    </dialog>
  )
}
