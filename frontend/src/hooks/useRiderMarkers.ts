'use client'

import { useEffect, useRef } from 'react'
import type { Marker } from 'mapbox-gl'

import { POSITION_INTERVAL_MS } from '@/hooks/useSharePosition'
import type { BaseMap } from '@/services/baseMap'
import { toLngLat } from '@/services/baseMap'
import { addRiderMarker } from '@/services/riderBubbleMarker'
import type { RiderMarkerData } from '@/services/riderMarkers'
import { interpolatePosition, runAnimation } from '@/services/riderMotion'
import type { Coordinates } from '@/types/geolocation'

// One report apart, so a rider is always still gliding to the last report when the next one lands.
const GLIDE_DURATION_MS = POSITION_INTERVAL_MS

/** A rider's marker, where it is drawn now and where it is gliding to. */
interface TrackedRider {
  readonly marker: Marker
  shown: Coordinates
  target: Coordinates
  cancelGlide: () => void
}

const isSamePosition = (a: Coordinates, b: Coordinates): boolean =>
  a.longitude === b.longitude && a.latitude === b.latitude

/** Glides the marker from where it is drawn now (so a glide cut short continues, with no jump) to the target. */
const startGlide = (tracked: TrackedRider, target: Coordinates): void => {
  tracked.cancelGlide()
  const from = tracked.shown
  tracked.target = target
  tracked.cancelGlide = runAnimation(GLIDE_DURATION_MS, (progress) => {
    tracked.shown = interpolatePosition(from, target, progress)
    tracked.marker.setLngLat(toLngLat(tracked.shown))
  })
}

const dropRider = (tracked: TrackedRider): void => {
  tracked.cancelGlide()
  tracked.marker.remove()
}

/** Keeps one marker on the map per rider: new riders get one, moved riders glide, gone riders lose theirs. */
export const useRiderMarkers = (mounted: BaseMap | null, riders: readonly RiderMarkerData[]): void => {
  const trackedRef = useRef(new Map<number, TrackedRider>())

  useEffect(() => {
    if (!mounted) return
    const tracked = trackedRef.current
    riders.forEach((rider) => {
      const existing = tracked.get(rider.id)
      if (!existing) {
        const marker = addRiderMarker(mounted.mapboxgl, mounted.map, rider)
        tracked.set(rider.id, { marker, shown: rider.position, target: rider.position, cancelGlide: () => {} })
      } else if (!isSamePosition(existing.target, rider.position)) {
        startGlide(existing, rider.position)
      }
    })
    const presentIds = new Set(riders.map(({ id }) => id))
    tracked.forEach((rider, id) => {
      if (presentIds.has(id)) return
      dropRider(rider)
      tracked.delete(id)
    })
  }, [mounted, riders])

  useEffect(() => {
    const tracked = trackedRef.current
    return () => {
      tracked.forEach(dropRider)
      tracked.clear()
    }
  }, [mounted])
}
