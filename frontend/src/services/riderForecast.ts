import { calculateBearing } from '@/services/bearing'
import { getPathLength, getPointAt, measureDistance } from '@/services/routeProgress'
import type { MeasuredPath } from '@/services/routeProgress'
import type { Coordinates } from '@/types/geolocation'

/**
 * How long a rider is moved on without a new report, at the speed of the last one. It bridges the gap between
 * reports (a report is already up to a send interval old when it arrives, and the next comes one interval later)
 * and a short loss of signal; beyond it the marker waits where it got to, until the rider reports again or is
 * dropped as stale (`STALE_AFTER_MS`).
 */
export const MAX_FORECAST_MS = 15_000

const MS_PER_SECOND = 1000
const METERS_PER_SECOND_PER_KMH = 1 / 3.6
// GPS speed never reads exactly zero; below this (about 1.5 km/h) the rider is standing.
const STANDING_METERS_PER_SECOND = 0.4
// Closer moves are noise: they say nothing about the direction.
const MIN_HEADING_MOVE_METERS = 5

/** What a rider reported: where they were, when this phone heard it (ms since the epoch) and the speed (km/h) if the device gave one. */
export interface ReportedMove {
  readonly position: Coordinates
  readonly reportedAt: number
  readonly speed: number | null
}

/** Where a rider is expected to go on from their last report: a street path from it, and how fast along it. */
export interface Forecast {
  /** Starts at the reported position and runs along the street the rider is on. */
  readonly path: MeasuredPath
  readonly metersPerSecond: number
  /** When the report was heard, in milliseconds since the epoch. */
  readonly startedAt: number
}

/**
 * How fast the rider moves, in meters per second: the speed the device gave, or else the distance between
 * this report and the one before over the time between them. Zero while standing or when there is nothing to tell by.
 */
export const estimateSpeed = (report: ReportedMove, previous: ReportedMove | null): number => {
  const seconds = previous ? (report.reportedAt - previous.reportedAt) / MS_PER_SECOND : 0
  const derived = previous && seconds > 0 ? measureDistance(previous.position, report.position) / seconds : 0
  const metersPerSecond = report.speed === null ? derived : report.speed * METERS_PER_SECOND_PER_KMH
  return metersPerSecond < STANDING_METERS_PER_SECOND ? 0 : metersPerSecond
}

/** The compass bearing of the rider's last move, or `lastHeading` while they have not moved enough to tell. */
export const estimateHeading = (
  report: ReportedMove,
  previous: ReportedMove | null,
  lastHeading: number | null,
): number | null => {
  if (!previous || measureDistance(previous.position, report.position) < MIN_HEADING_MOVE_METERS) return lastHeading
  return calculateBearing(previous.position, report.position)
}

const getTravelMeters = ({ path, metersPerSecond, startedAt }: Forecast, now: number): number => {
  const travelMs = Math.min(Math.max(0, now - startedAt), MAX_FORECAST_MS)
  return Math.min(getPathLength(path), (metersPerSecond * travelMs) / MS_PER_SECOND)
}

/** Where the forecast puts the rider at `now`: the reported position, moved on along the street at the last speed. */
export const forecastPosition = (forecast: Forecast, now: number): Coordinates =>
  getPointAt(forecast.path, getTravelMeters(forecast, now))
