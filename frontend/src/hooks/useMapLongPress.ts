'use client'

import { useEffect, useRef } from 'react'
import type { MapMouseEvent, MapTouchEvent } from 'mapbox-gl'

import type { BaseMap } from '@/services/baseMap'
import type { Coordinates } from '@/types/geolocation'

const LONG_PRESS_MS = 500
// A finger or a mouse never stays perfectly still, so a press that drifts this far is a drag.
const MOVE_TOLERANCE_PX = 8
const MARKER_SELECTOR = '.mapboxgl-marker'
// After a touch the browser also sends the mouse events of a click, a moment later. They are not a new press.
const COMPAT_MOUSE_WINDOW_MS = 1000
const CANCEL_EVENTS = ['mouseup', 'dragstart', 'zoomstart', 'rotatestart', 'pitchstart'] as const

interface LongPressHandlers {
  /** The map was pressed and held without moving. */
  onLongPress: (coordinates: Coordinates) => void
  /** The map was tapped, which is not the end of a long press. */
  onTap: () => void
}

type PressEvent = MapMouseEvent | MapTouchEvent

const isOnMarker = ({ originalEvent }: PressEvent): boolean =>
  originalEvent.target instanceof Element && originalEvent.target.closest(MARKER_SELECTOR) !== null

const isMultiTouch = (event: PressEvent): boolean => 'points' in event && event.points.length > 1

/**
 * Tells when the map is pressed and held in place, and when it is plainly tapped. The tap that
 * the browser sends when a long press ends is not reported, or the card it opens would close at once.
 */
export const useMapLongPress = (mounted: BaseMap | null, handlers: LongPressHandlers): void => {
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    if (!mounted) return
    const { map } = mounted
    let timeoutId: number | null = null
    let origin: PressEvent['point'] | null = null
    let hasFired = false
    let lastTouchEndAt = Number.NEGATIVE_INFINITY

    const cancel = () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId)
      timeoutId = null
      origin = null
    }
    const handleStart = (event: PressEvent) => {
      cancel()
      hasFired = false
      if (isOnMarker(event) || isMultiTouch(event)) return
      origin = event.point
      const { lng, lat } = event.lngLat
      timeoutId = window.setTimeout(() => {
        hasFired = true
        origin = null
        handlersRef.current.onLongPress({ longitude: lng, latitude: lat })
      }, LONG_PRESS_MS)
    }
    const handleMouseDown = (event: MapMouseEvent) => {
      if (performance.now() - lastTouchEndAt >= COMPAT_MOUSE_WINDOW_MS) handleStart(event)
    }
    const handleTouchEnd = () => {
      lastTouchEndAt = performance.now()
      cancel()
    }
    const handleMove = (event: PressEvent) => {
      if (origin && event.point.dist(origin) > MOVE_TOLERANCE_PX) cancel()
    }
    const handleClick = () => {
      if (hasFired) {
        hasFired = false
        return
      }
      handlersRef.current.onTap()
    }
    // Android Chrome opens its own menu on a long press; the pin is the menu here.
    const handleContextMenu = (event: MapMouseEvent) => event.originalEvent.preventDefault()

    map.on('mousedown', handleMouseDown)
    map.on('touchstart', handleStart)
    map.on('touchend', handleTouchEnd)
    map.on('touchcancel', handleTouchEnd)
    map.on('mousemove', handleMove)
    map.on('touchmove', handleMove)
    map.on('click', handleClick)
    map.on('contextmenu', handleContextMenu)
    CANCEL_EVENTS.forEach((name) => map.on(name, cancel))
    return () => {
      cancel()
      map.off('mousedown', handleMouseDown)
      map.off('touchstart', handleStart)
      map.off('touchend', handleTouchEnd)
      map.off('touchcancel', handleTouchEnd)
      map.off('mousemove', handleMove)
      map.off('touchmove', handleMove)
      map.off('click', handleClick)
      map.off('contextmenu', handleContextMenu)
      CANCEL_EVENTS.forEach((name) => map.off(name, cancel))
    }
  }, [mounted])
}
