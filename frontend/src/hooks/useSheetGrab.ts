'use client'

import { useRef } from 'react'
import type { PointerEvent } from 'react'

const DRAG_SLOP_PX = 8
const DRAG_COMMIT_PX = 32

interface SheetGrabOptions {
  isCollapsed: boolean
  onCollapsedChange: (isCollapsed: boolean) => void
}

interface GrabProps {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
  onPointerMove: (event: PointerEvent<HTMLElement>) => void
  onPointerUp: () => void
  onPointerCancel: () => void
}

interface SheetGrab {
  /** Spread on the sheet's header area. */
  grabProps: GrabProps
  /** Click handler of the chevron button in the header, for taps and keyboards. */
  handleToggleClick: () => void
}

interface Press {
  startY: number
  isDragging: boolean
  hasCommitted: boolean
}

/**
 * Dragging the top of a sheet down collapses it and dragging up expands it. The change happens
 * as soon as the finger has moved far enough, once per press. A press that never moves is a tap
 * and is left to the chevron button's click.
 */
export const useSheetGrab = ({ isCollapsed, onCollapsedChange }: SheetGrabOptions): SheetGrab => {
  const pressRef = useRef<Press | null>(null)
  const didDragRef = useRef(false)

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pressRef.current = { startY: event.clientY, isDragging: false, hasCommitted: false }
    didDragRef.current = false
  }

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const press = pressRef.current
    if (!press || press.hasCommitted) return
    const deltaY = event.clientY - press.startY
    if (!press.isDragging && Math.abs(deltaY) > DRAG_SLOP_PX) {
      press.isDragging = true
      didDragRef.current = true
      // Capturing only now keeps a plain tap's click on the chevron button.
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    const shouldCollapse = deltaY > DRAG_COMMIT_PX && !isCollapsed
    const shouldExpand = deltaY < -DRAG_COMMIT_PX && isCollapsed
    if (!shouldCollapse && !shouldExpand) return
    press.hasCommitted = true
    onCollapsedChange(shouldCollapse)
  }

  const endPress = () => {
    pressRef.current = null
  }

  const handleToggleClick = () => {
    if (didDragRef.current) return
    onCollapsedChange(!isCollapsed)
  }

  return {
    grabProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: endPress,
      onPointerCancel: endPress,
    },
    handleToggleClick,
  }
}
