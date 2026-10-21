'use client'

import { useEffect, useRef, useState } from 'react'

import { fetchStreetPath } from '@/services/streetRouteApi'
import { snapToStreet } from '@/services/streetSnapApi'
import type { Coordinates } from '@/types/geolocation'
import type { DraftPoint } from '@/types/route'

const NO_STREET_MESSAGE = 'No street here. Tap closer to a street to add a point.'
const NO_ROUTE_MESSAGE = 'There is no street route to that spot. Try a point on a connected street.'
const NO_RECONNECT_MESSAGE = 'The streets between the remaining points could not be joined, so the point was kept.'
const NO_REORDER_MESSAGE = 'The streets between the points in that order could not be joined, so the order was kept.'
const FAILED_MESSAGE = 'Could not follow the streets. Check your connection and try again.'

interface RouteDraftOptions {
  accessToken: string | undefined
  /** Points the draft starts with, for editing a saved route. */
  initialPoints: readonly DraftPoint[]
}

interface DraftChangeOptions {
  accessToken: string
  signal: AbortSignal
}

interface RouteDraft {
  points: readonly DraftPoint[]
  isBusy: boolean
  error: string | null
  addPoint: (coordinates: Coordinates, label?: string) => Promise<void>
  removePoint: (id: number) => Promise<void>
  movePoint: (id: number, toIndex: number) => Promise<void>
}

/** A leg from `previous` to `coordinates`, or null when there are no streets between them. */
const buildLeg = async (
  previous: DraftPoint | undefined,
  coordinates: Coordinates,
  options: DraftChangeOptions,
): Promise<readonly Coordinates[] | null> => {
  if (!previous) return [coordinates]
  const path = await fetchStreetPath(previous.coordinates, coordinates, options)
  // The path starts at the previous point, which the previous leg already ends with.
  return path && path.slice(1)
}

const moveItem = <TItem,>(items: readonly TItem[], from: number, to: number): TItem[] => {
  const moved = [...items]
  const [item] = moved.splice(from, 1)
  moved.splice(to, 0, item)
  return moved
}

// A leg only depends on the point before it, so a point that keeps its predecessor keeps its leg.
const rebuildLeg = async (
  point: DraftPoint,
  previous: DraftPoint | undefined,
  originalPoints: readonly DraftPoint[],
  options: DraftChangeOptions,
): Promise<readonly Coordinates[] | null> => {
  const originalPrevious = originalPoints[originalPoints.findIndex(({ id }) => id === point.id) - 1]
  if (originalPrevious?.id === previous?.id) return point.path
  return buildLeg(previous, point.coordinates, options)
}

/**
 * Ordered points of the route being drawn. Each tap is snapped to the nearest street, and each
 * leg between consecutive points follows the streets. Only one change runs at a time, so points
 * keep the order they were tapped in; taps meanwhile are ignored.
 */
export const useRouteDraft = ({ accessToken, initialPoints }: RouteDraftOptions): RouteDraft => {
  const [points, setPoints] = useState<readonly DraftPoint[]>(initialPoints)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isBusyRef = useRef(false)
  const nextIdRef = useRef(initialPoints.length)
  const controllerRef = useRef(new AbortController())

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current = controller
    return () => controller.abort()
  }, [])

  const runExclusive = async (change: (options: DraftChangeOptions) => Promise<void>) => {
    if (!accessToken || isBusyRef.current) return
    isBusyRef.current = true
    setIsBusy(true)
    setError(null)
    const { signal } = controllerRef.current
    try {
      await change({ accessToken, signal })
    } catch (failure) {
      if (signal.aborted) return
      console.error('Could not follow the streets', failure)
      setError(FAILED_MESSAGE)
    } finally {
      isBusyRef.current = false
      setIsBusy(false)
    }
  }

  const addPoint = (tapped: Coordinates, label?: string) =>
    runExclusive(async (options) => {
      const street = await snapToStreet(tapped, options)
      if (!street) return setError(NO_STREET_MESSAGE)
      const path = await buildLeg(points.at(-1), street, options)
      if (!path) return setError(NO_ROUTE_MESSAGE)
      const id = nextIdRef.current++
      setPoints((previous) => [...previous, { id, coordinates: street, path, label }])
    })

  // Removing a point joins its neighbours with a new leg; if that fails the point stays.
  const removePoint = (id: number) =>
    runExclusive(async (options) => {
      const index = points.findIndex((point) => point.id === id)
      const next = points[index + 1]
      if (index < 0) return
      const remaining = points.filter((point) => point.id !== id)
      if (!next) return setPoints(remaining)
      const path = await buildLeg(points[index - 1], next.coordinates, options)
      if (!path) return setError(NO_RECONNECT_MESSAGE)
      setPoints(remaining.map((point) => (point.id === next.id ? { ...point, path } : point)))
    })

  // Moving a point re-routes the legs whose previous point changed; if any cannot be joined,
  // the order is kept.
  const movePoint = (id: number, toIndex: number) =>
    runExclusive(async (options) => {
      const from = points.findIndex((point) => point.id === id)
      if (from < 0 || from === toIndex) return
      const reordered = moveItem(points, from, toIndex)
      const legs = await Promise.all(
        reordered.map((point, index) => rebuildLeg(point, reordered[index - 1], points, options)),
      )
      const paths = legs.filter((leg) => leg !== null)
      if (paths.length !== legs.length) return setError(NO_REORDER_MESSAGE)
      setPoints(reordered.map((point, index) => ({ ...point, path: paths[index] })))
    })

  return { points, isBusy, error, addPoint, removePoint, movePoint }
}
