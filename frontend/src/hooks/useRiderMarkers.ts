'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import type { Map as MapboxMap, Marker } from 'mapbox-gl'

import type { BaseMap } from '@/services/baseMap'
import { toLngLat } from '@/services/baseMap'
import { findPathAhead } from '@/services/pathAhead'
import { addRiderMarker } from '@/services/riderBubbleMarker'
import { estimateHeading, estimateSpeed, forecastPosition, MAX_FORECAST_MS } from '@/services/riderForecast'
import type { Forecast, ReportedMove } from '@/services/riderForecast'
import type { RiderMarkerData } from '@/services/riderMarkers'
import { measurePath } from '@/services/routeProgress'
import type { MeasuredPath } from '@/services/routeProgress'
import type { Coordinates } from '@/types/geolocation'

// A report puts the forecast of a rider on where they really were; the gap between that and where the marker
// was drawn closes smoothly (critically damped, so the marker neither jumps nor lurches) with this time constant.
const CORRECTION_TIME_CONSTANT_MS = 700
// How far ahead the speed of a marker is measured, by comparing two of its positions.
const RATE_SAMPLE_MS = 50
const MIN_ROUTE_POINTS = 2
const MS_PER_SECOND = 1000
const NO_ROUTE: readonly Coordinates[] = []
const NO_OFFSET: Offset = { longitude: 0, latitude: 0 }

/** Degrees, or degrees per millisecond for a rate. */
interface Offset {
  readonly longitude: number
  readonly latitude: number
}

/**
 * The gap between where the marker was drawn and where the new forecast puts it, and how fast that gap was
 * changing (so the marker keeps its speed), which then fades away.
 */
interface Correction {
  readonly gap: Offset
  readonly rate: Offset
  readonly startedAt: number
}

/** A rider's marker, with what is needed to move it between reports. */
interface TrackedRider {
  readonly marker: Marker
  report: ReportedMove
  heading: number | null
  forecast: Forecast
  correction: Correction
}

interface ForecastContext {
  readonly map: MapboxMap
  readonly route: MeasuredPath | null
}

const toReport = ({ position, speed, reportedAt }: RiderMarkerData): ReportedMove => ({ position, speed, reportedAt })

const buildForecast = (
  report: ReportedMove,
  previous: ReportedMove | null,
  heading: number | null,
  { map, route }: ForecastContext,
): Forecast => {
  const metersPerSecond = estimateSpeed(report, previous)
  const reach = (metersPerSecond * MAX_FORECAST_MS) / MS_PER_SECOND
  const points =
    metersPerSecond === 0
      ? [report.position]
      : findPathAhead({ position: report.position, heading, reach, route, map })
  return { path: measurePath(points), metersPerSecond, startedAt: report.reportedAt }
}

const fadeOut = (gap: number, rate: number, elapsed: number): number =>
  (gap + (rate + gap / CORRECTION_TIME_CONSTANT_MS) * elapsed) * Math.exp(-elapsed / CORRECTION_TIME_CONSTANT_MS)

/** Where the marker is drawn at `now`: where the forecast puts the rider, plus what is left of the gap the last report opened. */
const getShownPosition = ({ forecast, correction }: TrackedRider, now: number): Coordinates => {
  const forecasted = forecastPosition(forecast, now)
  const elapsed = now - correction.startedAt
  return {
    longitude: forecasted.longitude + fadeOut(correction.gap.longitude, correction.rate.longitude, elapsed),
    latitude: forecasted.latitude + fadeOut(correction.gap.latitude, correction.rate.latitude, elapsed),
  }
}

/** How fast a moving point is going at `now`, in degrees per millisecond, from where it is `RATE_SAMPLE_MS` later. */
const getRate = (positionAt: (time: number) => Coordinates, now: number): Offset => {
  const here = positionAt(now)
  const later = positionAt(now + RATE_SAMPLE_MS)
  return {
    longitude: (later.longitude - here.longitude) / RATE_SAMPLE_MS,
    latitude: (later.latitude - here.latitude) / RATE_SAMPLE_MS,
  }
}

const startTracking = (rider: RiderMarkerData, marker: Marker, context: ForecastContext, now: number): TrackedRider => {
  const report = toReport(rider)
  return {
    marker,
    report,
    heading: null,
    forecast: buildForecast(report, null, null, context),
    correction: { gap: NO_OFFSET, rate: NO_OFFSET, startedAt: now },
  }
}

/**
 * Starts a new forecast from a new report, keeping the marker where it is drawn and as fast as it goes: the gap
 * to the forecast fades out instead of the marker jumping or lurching.
 */
const applyReport = (tracked: TrackedRider, rider: RiderMarkerData, context: ForecastContext, now: number): void => {
  const shown = getShownPosition(tracked, now)
  const shownRate = getRate((time) => getShownPosition(tracked, time), now)
  const report = toReport(rider)
  tracked.heading = estimateHeading(report, tracked.report, tracked.heading)
  const forecast = buildForecast(report, tracked.report, tracked.heading, context)
  const forecasted = forecastPosition(forecast, now)
  const forecastRate = getRate((time) => forecastPosition(forecast, time), now)
  tracked.forecast = forecast
  tracked.correction = {
    gap: { longitude: shown.longitude - forecasted.longitude, latitude: shown.latitude - forecasted.latitude },
    rate: { longitude: shownRate.longitude - forecastRate.longitude, latitude: shownRate.latitude - forecastRate.latitude },
    startedAt: now,
  }
  tracked.report = report
}

/** New riders get a marker, riders with a new report a new forecast, and riders that are gone lose their marker. */
const syncRiders = (
  tracked: Map<number, TrackedRider>,
  riders: readonly RiderMarkerData[],
  { mounted, route }: { mounted: BaseMap; route: MeasuredPath | null },
): void => {
  const context = { map: mounted.map, route }
  const now = Date.now()
  riders.forEach((rider) => {
    const existing = tracked.get(rider.id)
    if (!existing) {
      const marker = addRiderMarker(mounted.mapboxgl, mounted.map, rider)
      tracked.set(rider.id, startTracking(rider, marker, context, now))
    } else if (existing.report.reportedAt !== rider.reportedAt) {
      applyReport(existing, rider, context, now)
    }
  })
  const presentIds = new Set(riders.map(({ id }) => id))
  tracked.forEach(({ marker }, id) => {
    if (presentIds.has(id)) return
    marker.remove()
    tracked.delete(id)
  })
}

/** Moves every marker on each frame to where its forecast puts the rider now. */
const useMarkerMotion = (mounted: BaseMap | null, trackedRef: RefObject<Map<number, TrackedRider>>): void => {
  useEffect(() => {
    if (!mounted) return
    let frameId = 0
    const draw = () => {
      const now = Date.now()
      trackedRef.current.forEach((tracked) => tracked.marker.setLngLat(toLngLat(getShownPosition(tracked, now))))
      frameId = requestAnimationFrame(draw)
    }
    frameId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frameId)
  }, [mounted, trackedRef])
}

/**
 * Keeps one marker on the map per rider. Between reports (every 2 seconds) the marker does not wait: it keeps
 * moving at the speed of the last report along the street the rider is on, the route's if they are on it, so
 * it shows where the rider is about now and not where they were. Each new report moves the forecast to the real
 * position and the marker eases onto it, never jumping. If reports stop, the marker goes on for
 * `MAX_FORECAST_MS` and then waits. `routePoints` is the route of the ride, empty in free mode.
 */
export const useRiderMarkers = (
  mounted: BaseMap | null,
  riders: readonly RiderMarkerData[],
  routePoints: readonly Coordinates[] = NO_ROUTE,
): void => {
  const trackedRef = useRef(new Map<number, TrackedRider>())
  const route = useMemo(
    () => (routePoints.length >= MIN_ROUTE_POINTS ? measurePath(routePoints) : null),
    [routePoints],
  )

  useEffect(() => {
    if (mounted) syncRiders(trackedRef.current, riders, { mounted, route })
  }, [mounted, riders, route])

  useMarkerMotion(mounted, trackedRef)

  useEffect(() => {
    const tracked = trackedRef.current
    return () => {
      tracked.forEach(({ marker }) => marker.remove())
      tracked.clear()
    }
  }, [mounted])
}
