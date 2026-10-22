'use client'

import { useId, useState } from 'react'

import CheckpointTimes from '@/components/route/CheckpointTimes'
import type { CheckpointTimesProps } from '@/components/route/CheckpointTimes'
import {
  formatAverageSpeed,
  formatClock,
  formatCurrentSpeed,
  formatDistance,
  formatDuration,
  formatSpeed,
} from '@/services/formatRoute'
import type { RideRoute } from '@/types/route'

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

interface RideStatsPanelProps {
  elapsedSeconds: number
  /** The current speed in meters per second, or null when the device gave none. */
  speed: number | null
  /** The top speed of the ride so far in km/h, or null when the device gave none. */
  maxSpeed: number | null
  /** The route being ridden, or null in free mode, which has no route stats. */
  route: Pick<RideRoute, 'distance' | 'estimated_time'> | null
  /** True when `route` holds what is left to the destination, not a whole route's figures. */
  isToGo?: boolean
  /** The kilometres covered so far, which the average speed of the ride is worked out from. */
  coveredKilometres: number
  /** The checkpoints of the route and when each was reached so far; null in free mode, which has none. */
  checkpoints: CheckpointTimesProps | null
}

/**
 * The strip under the ride map: how long the ride has lasted and how fast the rider goes now, and a button
 * that shows the rest of the stats of the ride summary. The details start hidden, to leave the map its room.
 */
export default function RideStatsPanel({
  elapsedSeconds,
  speed,
  maxSpeed,
  route,
  isToGo = false,
  coveredKilometres,
  checkpoints,
}: RideStatsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const detailsId = useId()

  return (
    <section className="ride-panel" aria-label="Ride stats">
      <div className="ride-panel-summary">
        <RideStat value={formatClock(elapsedSeconds)} label="Time (min:sec)" />
        <RideStat value={formatCurrentSpeed(speed)} label="Speed (km/h)" />
        <button
          className="icon-button ride-panel-toggle"
          type="button"
          aria-label={isExpanded ? 'Hide all stats' : 'Show all stats'}
          aria-expanded={isExpanded}
          aria-controls={detailsId}
          onClick={() => setIsExpanded((previous) => !previous)}
        >
          <span className="icon icon-chevron-down" aria-hidden="true"></span>
        </button>
      </div>
      <div className="ride-panel-details route-stats" id={detailsId} hidden={!isExpanded}>
        {route && (
          <>
            <RideStat value={formatDistance(route.distance)} label={isToGo ? 'Distance left' : 'Distance'} />
            <RideStat value={formatDuration(route.estimated_time)} label={isToGo ? 'Time left' : 'Estimated'} />
            <RideStat value={formatAverageSpeed(coveredKilometres, elapsedSeconds)} label="Avg km/h" />
          </>
        )}
        <RideStat value={formatSpeed(maxSpeed)} label="Max km/h" />
        {checkpoints && <CheckpointTimes {...checkpoints} />}
      </div>
    </section>
  )
}
