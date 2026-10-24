'use client'

import { useDragReorder } from '@/hooks/useDragReorder'
import { formatCoordinates } from '@/services/formatCoordinates'
import { describePlaceLocationCategory } from '@/services/placeLocationCategories'
import type { DraftPoint } from '@/types/route'

const MIN_POINTS_TO_REORDER = 2

interface RoutePointListProps {
  points: readonly DraftPoint[]
  onRemove: (id: number) => void
  onMove: (id: number, toIndex: number) => void
}

/** The start keeps its number; any other saved place shows its kind's icon, and a plain point its number. */
function PointIcon({ point, index }: { point: DraftPoint; index: number }) {
  if (index === 0 || !point.category) return <>{index + 1}</>
  return <span className={`icon icon-sm ${describePlaceLocationCategory(point.category).iconClass}`}></span>
}

/** A saved place says its kind; any other point its coordinates, as its name already says where it is. */
const describePoint = ({ category, coordinates }: DraftPoint): string =>
  category ? describePlaceLocationCategory(category).label : formatCoordinates(coordinates)

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
          {points.map((point, index) => (
            <li
              className="list-item route-point"
              key={point.id}
              aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
              {...getRowProps(index, points.length)}
            >
              <span className="list-item-icon" aria-hidden="true">
                <PointIcon point={point} index={index} />
              </span>
              <span className="list-item-body">
                <span className="list-item-title">{point.name || `Point ${index + 1}`}</span>
                <span className="list-item-meta">{describePoint(point)}</span>
              </span>
              <button
                className="icon-button"
                type="button"
                aria-label={`Remove point ${index + 1}`}
                onClick={() => onRemove(point.id)}
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
