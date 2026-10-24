import { formatCoordinates } from '@/services/formatCoordinates'
import { describePlaceLocationCategory } from '@/services/placeLocationCategories'
import type { SharedRoute } from '@/types/sharedRoute'

interface RouteCheckpointListProps {
  /** The id the panel's toggle points at. */
  id: string
  isExpanded: boolean
  route: Pick<SharedRoute, 'waypoints'>
}

interface Stop {
  readonly key: string
  readonly title: string
  /** The icon of the start, the finish or the kind of place; a plain checkpoint shows its number. */
  readonly iconClass?: string
  /** Whether it is a saved place, which is blue as on the map. */
  readonly isPlace?: boolean
  readonly number: number
  /** The address, or the coordinates while it is not known. */
  readonly detail: string
}

/**
 * Named as on the map: the start and the finish keep their flags; any other point is titled by its saved place
 * or "Checkpoint N" (a point named by its own address is titled by its number), with the kind's icon when it is
 * a saved place. Each says its address under the title: the coordinates only stand in for one that is not known.
 */
const buildStops = ({ waypoints }: RouteCheckpointListProps['route']): Stop[] =>
  waypoints.map(({ coordinates, name, address, category }, index) => {
    const number = index + 1
    const detail = address || formatCoordinates(coordinates)
    if (index === 0) return { key: 'start', title: 'Start', iconClass: 'icon-flag', number, detail }
    if (index === waypoints.length - 1) {
      return { key: 'finish', title: 'Finish', iconClass: 'icon-flag-checkered', number, detail }
    }
    const key = `checkpoint-${number}`
    const title = name && name !== address ? name : `Checkpoint ${number}`
    if (!category) return { key, title, number, detail }
    return { key, title, iconClass: describePlaceLocationCategory(category).iconClass, isPlace: true, number, detail }
  })

function StopRow({ stop }: { stop: Stop }) {
  const { title, iconClass, isPlace, number, detail } = stop

  return (
    <li className="list-item">
      <span className={isPlace ? 'avatar avatar-sm avatar-place' : 'avatar avatar-sm avatar-primary'} aria-hidden="true">
        {iconClass ? <span className={`icon icon-sm ${iconClass}`}></span> : number}
      </span>
      <span className="list-item-body">
        <span className="list-item-title">{title}</span>
        <span className="list-item-meta">{detail}</span>
      </span>
    </li>
  )
}

/**
 * The points the rider chose: the start, every checkpoint and the finish with their names and coordinates.
 * Always laid out open; it is shown only while the panel is expanded.
 */
export default function RouteCheckpointList({ id, route, isExpanded }: RouteCheckpointListProps) {
  return (
    <div className="checkpoint-times" id={id} hidden={!isExpanded}>
      <ul className="list list-flat">
        {buildStops(route).map((stop) => (
          <StopRow key={stop.key} stop={stop} />
        ))}
      </ul>
    </div>
  )
}
