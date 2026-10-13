'use client'

import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

import { createBaseMap } from '@/services/baseMap'
import type { BaseMap } from '@/services/baseMap'
import type { Coordinates } from '@/types/geolocation'

interface MapView {
  readonly center: Coordinates
  readonly zoom: number
  readonly pitch?: number
  readonly bearing?: number
}

interface MapInstanceOptions {
  accessToken: string | undefined
  /** Where the camera starts; only read when the map is created. */
  view: MapView
  /** Called once with the new map, before `mounted` is set: attach event handlers here. */
  onReady?: (base: BaseMap) => void
}

interface MapInstance {
  containerRef: RefObject<HTMLDivElement | null>
  mounted: BaseMap | null
  hasLoadFailed: boolean
}

/** Creates a Mapbox map in `containerRef` once the token is known and removes it on unmount. */
export const useMapInstance = ({ accessToken, view, onReady }: MapInstanceOptions): MapInstance => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState<BaseMap | null>(null)
  const [hasMountFailed, setHasMountFailed] = useState(false)
  const viewRef = useRef(view)
  const onReadyRef = useRef(onReady)

  useEffect(() => {
    viewRef.current = view
    onReadyRef.current = onReady
  }, [view, onReady])

  useEffect(() => {
    const container = containerRef.current
    if (!accessToken || !container) return

    const controller = new AbortController()
    let createdMap: BaseMap | null = null
    // Mapbox only resizes with the window, but the container also changes size when the tab bar
    // is hidden or shown.
    const resizeObserver = new ResizeObserver(() => createdMap?.map.resize())
    resizeObserver.observe(container)
    const load = async () => {
      try {
        createdMap = await createBaseMap({
          ...viewRef.current,
          container,
          accessToken,
          signal: controller.signal,
          onUnauthorized: () => setHasMountFailed(true),
        })
        if (!createdMap) return
        onReadyRef.current?.(createdMap)
        setMounted(createdMap)
      } catch (error) {
        console.error('Could not load the map', error)
        setHasMountFailed(true)
      }
    }
    load()

    return () => {
      controller.abort()
      resizeObserver.disconnect()
      createdMap?.map.remove()
      setMounted(null)
    }
  }, [accessToken])

  return { containerRef, mounted, hasLoadFailed: hasMountFailed || !accessToken }
}
