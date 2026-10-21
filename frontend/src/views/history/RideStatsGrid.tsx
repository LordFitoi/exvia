import {
  formatAverageSpeed,
  formatClock,
  formatDistance,
  formatDuration,
  formatSpeed,
  NO_VALUE,
} from '@/services/formatRoute'
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
 * The time and distance of a ride, then its average and top speed. The top speed comes from the
 * phone's GPS. The route's distance only describes a finished ride, so a ride quit early shows a
 * dash for the distance and the average speed.
 */
export default function RideStatsGrid({ summary }: RideStatsGridProps) {
  const { duration, distance, estimated_time, is_finished, max_speed } = summary

  return (
    <section className="stack" aria-label="Ride statistics">
      <div className="route-stats route-stats-pair">
        <RideStat value={formatClock(duration)} label="Time" />
        <RideStat value={is_finished ? formatDistance(distance) : NO_VALUE} label="Distance" />
      </div>
      <p className="text-small text-muted">Estimated time was {formatDuration(estimated_time)}.</p>
      <div className="route-stats route-stats-pair">
        <RideStat value={is_finished ? formatAverageSpeed(distance, duration) : NO_VALUE} label="Avg km/h" />
        <RideStat value={formatSpeed(max_speed)} label="Max km/h" />
      </div>
    </section>
  )
}
