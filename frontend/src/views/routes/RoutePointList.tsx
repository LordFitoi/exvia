import type { DraftPoint } from '@/types/route'

const COORDINATE_DECIMALS = 5

interface RoutePointListProps {
  points: readonly DraftPoint[]
  onRemove: (id: number) => void
}

const formatCoordinates = ({ latitude, longitude }: DraftPoint['coordinates']): string =>
  `${latitude.toFixed(COORDINATE_DECIMALS)}, ${longitude.toFixed(COORDINATE_DECIMALS)}`

export default function RoutePointList({ points, onRemove }: RoutePointListProps) {
  if (points.length === 0) {
    return (
      <p className="text-small text-muted">
        Tap the map to add the first point. Points snap to the nearest street.
      </p>
    )
  }

  return (
    <div className="route-point-list">
      <ul className="list">
        {points.map(({ id, coordinates }, index) => (
          <li className="list-item" key={id}>
            <span className="list-item-icon" aria-hidden="true">
              {index + 1}
            </span>
            <span className="list-item-body">
              <span className="list-item-title">Point {index + 1}</span>
              <span className="list-item-meta">{formatCoordinates(coordinates)}</span>
            </span>
            <button
              className="icon-button"
              type="button"
              aria-label={`Remove point ${index + 1}`}
              onClick={() => onRemove(id)}
            >
              <span className="icon icon-x" aria-hidden="true"></span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
