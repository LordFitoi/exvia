'use client'

import { useEffect, useMemo, useState } from 'react'

import type { BaseMap } from '@/services/baseMap'
import { buildEdgeTargets, isSameIndicators, placeEdgeIndicators } from '@/services/edgeIndicators'
import type { EdgeIndicator } from '@/services/edgeIndicators'
import type { RiderMarkerData } from '@/services/riderMarkers'
import type { Coordinates } from '@/types/geolocation'

/**
 * The user and the riders who are out of the map's view, each with the map-edge spot that faces them.
 * Recomputed whenever the camera moves or resizes and whenever someone's position changes.
 */
export const useEdgeIndicators = (
  mounted: BaseMap | null,
  user: Coordinates | null,
  riders: readonly RiderMarkerData[],
): readonly EdgeIndicator[] => {
  const [indicators, setIndicators] = useState<readonly EdgeIndicator[]>([])
  const targets = useMemo(() => buildEdgeTargets(user, riders), [user, riders])

  useEffect(() => {
    if (!mounted) return
    const { map } = mounted
    const refresh = () => {
      const next = placeEdgeIndicators(map, targets)
      setIndicators((current) => (isSameIndicators(current, next) ? current : next))
    }
    refresh()
    map.on('move', refresh)
    map.on('resize', refresh)
    return () => {
      map.off('move', refresh)
      map.off('resize', refresh)
    }
  }, [mounted, targets])

  return indicators
}
