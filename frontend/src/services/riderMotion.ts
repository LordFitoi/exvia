import type { Coordinates } from '@/types/geolocation'

const DEGREES_IN_CIRCLE = 360
const HALF_CIRCLE = 180

export const interpolatePosition = (
  from: Coordinates,
  to: Coordinates,
  progress: number,
): Coordinates => ({
  longitude: from.longitude + (to.longitude - from.longitude) * progress,
  latitude: from.latitude + (to.latitude - from.latitude) * progress,
})

/** A bearing between two bearings, turning the short way round (350 to 10 passes through 0). */
export const interpolateBearing = (from: number, to: number, progress: number): number => {
  const turn = ((to - from + DEGREES_IN_CIRCLE + HALF_CIRCLE) % DEGREES_IN_CIRCLE) - HALF_CIRCLE
  return (from + turn * progress + DEGREES_IN_CIRCLE) % DEGREES_IN_CIRCLE
}

/** Calls `onFrame` with the progress, 0 to 1, on every frame for `durationMs`. Returns a cancel function. */
export const runAnimation = (durationMs: number, onFrame: (progress: number) => void): (() => void) => {
  const startedAt = performance.now()
  let frameId = 0
  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / durationMs)
    onFrame(progress)
    if (progress < 1) frameId = requestAnimationFrame(step)
  }
  frameId = requestAnimationFrame(step)
  return () => cancelAnimationFrame(frameId)
}
