import {
  formatAverageSpeed,
  formatClock,
  formatDistance,
  formatDuration,
  formatSpeed,
  NO_VALUE,
} from '@/services/formatRoute'
import { MOVING_SPEED_KMH } from '@/services/rideSpeed'
import type { RideSummaryDetail } from '@/types/rideSummary'

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

interface RideStatsGridProps {
  summary: RideSummaryDetail
}

/**
 * The time, distance and speeds of a ride. Speeds come from the phone's GPS, stops left out. The
 * route's distance only describes a finished ride, so a ride quit early shows a dash for it.
 */
export default function RideStatsGrid({ summary }: RideStatsGridProps) {
  const { duration, distance, estimated_time, is_finished, max_speed, min_speed, avg_speed } = summary

  return (
    <section className="stack" aria-label="Ride statistics">
      <div className="route-stats">
        <RideStat value={formatClock(duration)} label="Time" />
        <RideStat value={is_finished ? formatDistance(distance) : NO_VALUE} label="Distance" />
        <RideStat value={is_finished ? formatAverageSpeed(distance, duration) : NO_VALUE} label="Avg km/h" />
      </div>
      <p className="text-small text-muted">Estimated time was {formatDuration(estimated_time)}.</p>
      <h2 className="text-subtitle">Speed</h2>
      <div className="route-stats">
        <RideStat value={formatSpeed(max_speed)} label="Max km/h" />
        <RideStat value={formatSpeed(min_speed)} label="Lowest km/h" />
        <RideStat value={formatSpeed(avg_speed)} label="Moving km/h" />
      </div>
      <p className="text-small text-muted">
        Moving km/h is the average while riding; stops under {MOVING_SPEED_KMH} km/h are not counted.
      </p>
    </section>
  )
}
