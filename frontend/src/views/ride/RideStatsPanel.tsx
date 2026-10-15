import { formatClock, formatCurrentSpeed } from '@/services/formatRoute'

interface RideStatsPanelProps {
  elapsedSeconds: number
  /** The current speed in meters per second, or null when the device gave none. */
  speed: number | null
}

/** The strip under the ride map: how long the ride has lasted and how fast the rider goes now. */
export default function RideStatsPanel({ elapsedSeconds, speed }: RideStatsPanelProps) {
  return (
    <section className="ride-panel" aria-label="Ride stats">
      <div className="route-stat">
        <span className="route-stat-value data">{formatClock(elapsedSeconds)}</span>
        <span className="text-caption">Time (min:sec)</span>
      </div>
      <div className="route-stat">
        <span className="route-stat-value data">{formatCurrentSpeed(speed)}</span>
        <span className="text-caption">Speed (km/h)</span>
      </div>
    </section>
  )
}
