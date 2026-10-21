import { formatAverageSpeed, formatClock, formatTimeOfDay, NO_VALUE } from '@/services/formatRoute'

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
}

interface Stop {
  readonly key: string
  readonly title: string
  /** The marker icon of the start and the finish; a checkpoint shows its number. */
  readonly iconClass?: string
  readonly number?: number
  /** When the rider got there, or null while they have not. */
  readonly reachedAt: number | null
  /** The average speed, in km/h, over the leg that ends here; null when it is unknown. */
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

/**
 * The average speed over the leg that ends at `stop`: the leg's length over the time since the stop before it.
 * Unknown when either stop is not reached, the leg has no length, or both were marked at the same moment
 * (riding past several checkpoints at once marks them together).
 */
const getLegSpeed = (stop: StopBase, previous: StopBase | undefined, legKilometres: number | undefined): string | null => {
  if (!previous || previous.reachedAt === null || stop.reachedAt === null || legKilometres === undefined) return null
  const speed = formatAverageSpeed(legKilometres, (stop.reachedAt - previous.reachedAt) / MS_PER_SECOND)
  return speed === NO_VALUE ? null : speed
}

const buildStops = (props: CheckpointTimesProps): Stop[] =>
  buildBaseStops(props).map((stop, index, stops) => ({
    ...stop,
    legSpeed: getLegSpeed(stop, stops[index - 1], props.legKilometres[index - 1]),
  }))

/** "At 09:12", with the average speed of the leg that led here when it is known: "At 09:12 · 24.5 km/h". */
const describeArrival = (reachedAt: number, legSpeed: string | null): string => {
  const hour = `At ${formatTimeOfDay(reachedAt)}`
  return legSpeed === null ? hour : `${hour} · ${legSpeed} km/h`
}

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
        <span className="list-item-meta">{isReached ? describeArrival(reachedAt, legSpeed) : 'Not reached yet'}</span>
      </span>
      <span className="data">{isReached ? formatClock(secondsFromStart) : NO_VALUE}</span>
    </li>
  )
}

/**
 * The start, every checkpoint and the finish of the route, one row each. A stop not reached yet is gray; once
 * reached it is colored and shows the hour it was reached at, the average speed since the stop before it and the
 * time it took from the start.
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
