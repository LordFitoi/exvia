'use client'

import { useEffect } from 'react'

// Safari on iOS ignores `user-scalable=no` and `touch-action`, and reports a pinch as this event.
const PINCH_EVENT = 'gesturestart'

/** Stops the page from zooming when pinched on iOS, where the viewport cannot forbid it. */
export default function PinchZoomLock() {
  useEffect(() => {
    const preventZoom = (event: Event) => event.preventDefault()
    document.addEventListener(PINCH_EVENT, preventZoom)
    return () => document.removeEventListener(PINCH_EVENT, preventZoom)
  }, [])

  return null
}
