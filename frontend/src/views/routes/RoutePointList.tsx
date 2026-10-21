'use client'

import { useDragReorder } from '@/hooks/useDragReorder'
import type { DraftPoint } from '@/types/route'

const COORDINATE_DECIMALS = 5
const MIN_POINTS_TO_REORDER = 2

interface RoutePointListProps {
  points: readonly DraftPoint[]
  onRemove: (id: number) => void
  onMove: (id: number, toIndex: number) => void
}

const formatCoordinates = ({ latitude, longitude }: DraftPoint['coordinates']): string =>
  `${latitude.toFixed(COORDINATE_DECIMALS)}, ${longitude.toFixed(COORDINATE_DECIMALS)}`

export default function RoutePointList({ points, onRemove, onMove }: RoutePointListProps) {
  const { listRef, getRowProps } = useDragReorder({
    onReorder: (from, to) => onMove(points[from].id, to),
  })

  if (points.length === 0) {
    return (
      <p className="text-small text-muted">
        Tap the map to add the first point. Points snap to the nearest street.
      </p>
    )
  }

  return (
    <>
      <div className="route-point-list" ref={listRef}>
        <ul className="list">
          {points.map(({ id, coordinates, label }, index) => (
            <li
              className="list-item route-point"
              key={id}
              aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
              {...getRowProps(index, points.length)}
            >
              <span className="list-item-icon" aria-hidden="true">
                {index + 1}
              </span>
              <span className="list-item-body">
                <span className="list-item-title">{label ?? `Point ${index + 1}`}</span>
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
      {points.length >= MIN_POINTS_TO_REORDER && (
        <p className="text-caption">Press and hold a point, then move it up or down to reorder.</p>
      )}
    </>
  )
}
