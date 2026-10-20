'use client'

import { useRef } from 'react'
import type { PointerEvent, RefObject } from 'react'

const DRAG_SLOP_PX = 8
const CLOSE_DRAG_PX = 96

interface GrabProps {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
  onPointerMove: (event: PointerEvent<HTMLElement>) => void
  onPointerUp: () => void
  onPointerCancel: () => void
}

/**
 * Dragging the header of a modal sheet down slides the card with the finger. Letting go past a
 * threshold closes it; letting go early springs it back. The card moves with an inline transform and
 * carries `data-dragging` meanwhile, so the spring does not fight the finger. A press that never moves
 * is a tap and is left to the buttons inside the header. Spread the result on the `sheet-grab`.
 */
export const useSheetDragClose = (sheetRef: RefObject<HTMLElement | null>, onClose: () => void): GrabProps => {
  const startYRef = useRef<number | null>(null)
  const dragYRef = useRef(0)
  const isDraggingRef = useRef(false)

  const resetPress = () => {
    startYRef.current = null
    dragYRef.current = 0
    isDraggingRef.current = false
  }

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    startYRef.current = event.clientY
  }

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const sheet = sheetRef.current
    if (startYRef.current === null || !sheet) return
    const deltaY = event.clientY - startYRef.current
    if (!isDraggingRef.current) {
      if (Math.abs(deltaY) <= DRAG_SLOP_PX) return
      isDraggingRef.current = true
      // Capturing only now keeps a plain tap's click on the buttons of the header.
      event.currentTarget.setPointerCapture(event.pointerId)
      sheet.dataset.dragging = ''
    }
    dragYRef.current = Math.max(0, deltaY)
    sheet.style.transform = `translateY(${dragYRef.current}px)`
  }

  const handlePointerUp = () => {
    const sheet = sheetRef.current
    const shouldClose = isDraggingRef.current && dragYRef.current > CLOSE_DRAG_PX
    if (sheet && isDraggingRef.current) {
      delete sheet.dataset.dragging
      if (!shouldClose) sheet.style.transform = ''
    }
    resetPress()
    if (shouldClose) onClose()
  }

  const handlePointerCancel = () => {
    const sheet = sheetRef.current
    if (sheet) {
      delete sheet.dataset.dragging
      sheet.style.transform = ''
    }
    resetPress()
  }

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  }
}
