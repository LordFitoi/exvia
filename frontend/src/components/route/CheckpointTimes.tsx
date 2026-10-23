import { formatAverageSpeed, formatClock, formatTimeOfDay, NO_VALUE } from '@/services/formatRoute'
import type { CurrentLeg } from '@/types/route'

const MS_PER_SECOND = 1000
// The start is checkpoint 1 on the route's markers, so the first one after it is 2.
const FIRST_CHECKPOINT_NUMBER = 2

export interface CheckpointTimesProps {
  /** When the ride started, in milliseconds since the epoch. */
  startedAt: number
  /** How many checkpoints the route has between the start and the finish. */
  count: number
  /** When the rider reached the start and then each checkpoint, in route order, in milliseconds since the epoch. */
  reachedAt: readonly number[]
  /** When the rider reached the finish, or null while they have not. */
  finishedAt: number | null
  /** The kilometres of each leg of the route, from the start to the first checkpoint and so on to the finish; empty when unknown. */
  legKilometres: readonly number[]
  /**
   * The straight-line kilometres from where the rider was when ride mode opened to the start, which the speed
   * of the start is worked out from; null or omitted when unknown (the rider began at the start, or the ride is
   * from the history, which does not keep where it began).
   */
  approachKilometres?: number | null
  /**
   * How far the rider has got on the leg they are on, from the last stop reached, which the average speed so far
   * of the next stop is worked out from; null or omitted when unknown (the rider has not reached the start, or the
   * ride is from the history, which has no position).
   */
  currentLeg?: CurrentLeg | null
}

interface Stop {
  readonly key: string
  readonly title: string
  /** The marker icon of the start and the finish; a checkpoint shows its number. */
  readonly iconClass?: string
  readonly number?: number
  /** When the rider got there, or null while they have not. */
  readonly reachedAt: number | null
  /** The average speed, in km/h, over the leg that ends here (so far, for the next stop); null when it is unknown. */
  readonly legSpeed: string | null
}

type StopBase = Omit<Stop, 'legSpeed'>

const buildBaseStops = ({ count, reachedAt, finishedAt }: CheckpointTimesProps): StopBase[] => [
  { key: 'start', title: 'Start', iconClass: 'icon-flag', reachedAt: reachedAt[0] ?? null },
  ...Array.from({ length: count }, (_, index) => ({
    key: `checkpoint-${index}`,
    title: `Checkpoint ${index + FIRST_CHECKPOINT_NUMBER}`,
    number: index + FIRST_CHECKPOINT_NUMBER,
    reachedAt: reachedAt[index + 1] ?? null,
  })),
  { key: 'finish', title: 'Finish', iconClass: 'icon-flag-checkered', reachedAt: finishedAt },
]

/** The leg that ends at a stop: when the rider set out on it, when it ended and how long it is, or null/undefined when unknown. */
interface Leg {
  readonly setOutAt: number | null
  readonly endedAt: number | null
  readonly kilometres: number | undefined
}

/**
 * The leg ending at the stop at `index`. The leg to the start begins when ride mode opened; each of the others
 * begins at the stop before it. The next stop the rider has not reached yet has the leg in progress: it ends at
 * the rider's latest fix, and is as long as they have got on it.
 */
const getLeg = (index: number, stops: readonly StopBase[], props: CheckpointTimesProps): Leg => {
  const { reachedAt } = stops[index]
  if (index === 0) return { setOutAt: props.startedAt, endedAt: reachedAt, kilometres: props.approachKilometres ?? undefined }
  const setOutAt = stops[index - 1].reachedAt
  if (reachedAt === null && props.currentLeg) {
    return { setOutAt, endedAt: props.currentLeg.at, kilometres: props.currentLeg.kilometres }
  }
  return { setOutAt, endedAt: reachedAt, kilometres: props.legKilometres[index - 1] }
}

/**
 * The average speed over a leg: its length over the time between its ends. Unknown when the leg has not begun
 * or has no length, or both ends were at the same moment (riding past several checkpoints at once marks them together).
 */
const getLegSpeed = ({ setOutAt, endedAt, kilometres }: Leg): string | null => {
  if (setOutAt === null || endedAt === null || kilometres === undefined) return null
  const speed = formatAverageSpeed(kilometres, (endedAt - setOutAt) / MS_PER_SECOND)
  return speed === NO_VALUE ? null : speed
}

const buildStops = (props: CheckpointTimesProps): Stop[] =>
  buildBaseStops(props).map((stop, index, stops) => ({
    ...stop,
    legSpeed: getLegSpeed(getLeg(index, stops, props)),
  }))

/** "At 09:12", with the average speed of the leg that led here when it is known: "At 09:12 · 24.5 km/h". */
const describeArrival = (reachedAt: number, legSpeed: string | null): string => {
  const hour = `At ${formatTimeOfDay(reachedAt)}`
  return legSpeed === null ? hour : `${hour} · ${legSpeed} km/h`
}

/** "Not reached yet", with the average speed so far of the leg on the way here when it is known: "Not reached yet · 24.5 km/h so far". */
const describePending = (legSpeed: string | null): string =>
  legSpeed === null ? 'Not reached yet' : `Not reached yet · ${legSpeed} km/h so far`

function StopRow({ stop, startedAt }: { stop: Stop; startedAt: number }) {
  const { title, iconClass, number, reachedAt, legSpeed } = stop
  const isReached = reachedAt !== null
  const secondsFromStart = isReached ? Math.max(0, (reachedAt - startedAt) / MS_PER_SECOND) : 0

  return (
    <li className={isReached ? 'list-item' : 'list-item list-item-pending'}>
      <span className={isReached ? 'avatar avatar-sm avatar-primary' : 'avatar avatar-sm'} aria-hidden="true">
        {iconClass ? <span className={`icon icon-sm ${iconClass}`}></span> : number}
      </span>
      <span className="list-item-body">
        <span className="list-item-title">{title}</span>
        <span className="list-item-meta">{isReached ? describeArrival(reachedAt, legSpeed) : describePending(legSpeed)}</span>
      </span>
      <span className="data">{isReached ? formatClock(secondsFromStart) : NO_VALUE}</span>
    </li>
  )
}

/**
 * The start, every checkpoint and the finish of the route, one row each. A stop not reached yet is gray; once
 * reached it is colored and shows the hour it was reached at, the average speed since the stop before it (for the
 * start, since ride mode opened) and the time it took from the start. The next stop, still gray, shows the average
 * speed so far since the last one reached.
 */
export default function CheckpointTimes(props: CheckpointTimesProps) {
  return (
    <section className="checkpoint-times stack-sm" aria-label="Checkpoint times">
      <h2 className="text-subtitle">Checkpoints</h2>
      <ul className="list list-flat">
        {buildStops(props).map((stop) => (
          <StopRow key={stop.key} stop={stop} startedAt={props.startedAt} />
        ))}
      </ul>
    </section>
  )
}
