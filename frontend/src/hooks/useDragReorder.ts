'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from 'react'

const LONG_PRESS_MS = 400
const MOVE_TOLERANCE_PX = 8
const AUTOSCROLL_EDGE_PX = 32
const AUTOSCROLL_STEP_PX = 8
const AUTOSCROLL_INTERVAL_MS = 16
const HAPTIC_MS = 15
const ROW_SELECTOR = '[data-reorder-row]'
const CONTROL_SELECTOR = 'button, a, input, textarea, select'
const KEY_STEPS: Readonly<Record<string, number>> = { ArrowUp: -1, ArrowDown: 1 }

interface DragState {
  readonly from: number
  readonly target: number
  readonly offsetY: number
  readonly rowHeight: number
}

type GesturePhase = 'idle' | 'pending' | 'dragging'

interface Gesture {
  phase: GesturePhase
  row: HTMLElement | null
  pointerId: number
  startX: number
  startY: number
  clientY: number
  from: number
  target: number
  startContentY: number
  rowHeight: number
  pressTimerId: number | undefined
  scrollTimerId: number | undefined
}

interface DragReorderOptions {
  /** Called once when a dragged row is dropped on a different position. */
  onReorder: (from: number, to: number) => void
}

interface DragReorderHandle {
  /**
   * Ref callback for the scrolling element that contains the rows. It must be positioned
   * (`position: relative`). The element may mount after the hook, e.g. once the first row exists.
   */
  listRef: (node: HTMLDivElement | null) => void
  getRowProps: (index: number, rowCount: number) => RowProps
}

interface RowProps {
  'data-reorder-row': string
  'data-dragging': boolean
  tabIndex: number
  style: CSSProperties | undefined
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
  onPointerMove: (event: PointerEvent<HTMLElement>) => void
  onPointerUp: () => void
  onPointerCancel: () => void
  onContextMenu: (event: MouseEvent<HTMLElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
}

const createIdleGesture = (): Gesture => ({
  phase: 'idle',
  row: null,
  pointerId: 0,
  startX: 0,
  startY: 0,
  clientY: 0,
  from: 0,
  target: 0,
  startContentY: 0,
  rowHeight: 0,
  pressTimerId: undefined,
  scrollTimerId: undefined,
})

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

const getRows = (list: HTMLElement): HTMLElement[] =>
  Array.from(list.querySelectorAll<HTMLElement>(ROW_SELECTOR))

// Position inside the scrolled content, which stays valid while the list autoscrolls.
const toContentY = (list: HTMLElement, clientY: number): number =>
  clientY - list.getBoundingClientRect().top + list.scrollTop

const findTargetIndex = (rows: readonly HTMLElement[], contentY: number): number => {
  const index = rows.findIndex((row) => contentY < row.offsetTop + row.offsetHeight)
  return index === -1 ? rows.length - 1 : index
}

// Rows between the dragged row's old and new position slide by one row to open the gap.
const getRowShift = ({ from, target, rowHeight }: DragState, index: number): number => {
  if (from < target && index > from && index <= target) return -rowHeight
  if (from > target && index >= target && index < from) return rowHeight
  return 0
}

const getRowStyle = (drag: DragState | null, index: number): CSSProperties | undefined => {
  if (!drag) return undefined
  const offset = index === drag.from ? drag.offsetY : getRowShift(drag, index)
  return { transform: `translateY(${offset}px)` }
}

/**
 * Press and hold a row, then move up or down to reorder it. A short press or a drag that starts
 * before the hold ends is left to the browser, so the list still scrolls. Alt+ArrowUp and
 * Alt+ArrowDown move a focused row for keyboard users.
 */
export const useDragReorder = ({ onReorder }: DragReorderOptions): DragReorderHandle => {
  const listNodeRef = useRef<HTMLDivElement | null>(null)
  const [listNode, setListNode] = useState<HTMLDivElement | null>(null)
  const gestureRef = useRef<Gesture>(createIdleGesture())
  const [drag, setDrag] = useState<DragState | null>(null)

  const listRef = useCallback((node: HTMLDivElement | null) => {
    listNodeRef.current = node
    setListNode(node)
  }, [])

  const updateDrag = () => {
    const list = listNodeRef.current
    const gesture = gestureRef.current
    if (!list || gesture.phase !== 'dragging') return
    const rows = getRows(list)
    const contentY = toContentY(list, gesture.clientY)
    const rowTop = rows[gesture.from].offsetTop
    const offsetY = clamp(
      contentY - gesture.startContentY,
      -rowTop,
      list.scrollHeight - rowTop - gesture.rowHeight,
    )
    gesture.target = findTargetIndex(rows, contentY)
    setDrag({ from: gesture.from, target: gesture.target, offsetY, rowHeight: gesture.rowHeight })
  }

  const autoscroll = () => {
    const list = listNodeRef.current
    if (!list) return
    const { top, bottom } = list.getBoundingClientRect()
    const { clientY } = gestureRef.current
    const before = list.scrollTop
    if (clientY < top + AUTOSCROLL_EDGE_PX) list.scrollTop -= AUTOSCROLL_STEP_PX
    if (clientY > bottom - AUTOSCROLL_EDGE_PX) list.scrollTop += AUTOSCROLL_STEP_PX
    if (list.scrollTop !== before) updateDrag()
  }

  const startDragging = () => {
    const list = listNodeRef.current
    const gesture = gestureRef.current
    if (!list || !gesture.row) return
    gesture.phase = 'dragging'
    gesture.rowHeight = gesture.row.offsetHeight
    gesture.startContentY = toContentY(list, gesture.clientY)
    gesture.target = gesture.from
    gesture.row.setPointerCapture(gesture.pointerId)
    gesture.scrollTimerId = window.setInterval(autoscroll, AUTOSCROLL_INTERVAL_MS)
    navigator.vibrate?.(HAPTIC_MS)
    updateDrag()
  }

  const finishGesture = (shouldCommit: boolean) => {
    const gesture = gestureRef.current
    if (gesture.phase === 'idle') return
    window.clearTimeout(gesture.pressTimerId)
    window.clearInterval(gesture.scrollTimerId)
    const { phase, from, target } = gesture
    gestureRef.current = createIdleGesture()
    setDrag(null)
    if (phase === 'dragging' && shouldCommit && from !== target) onReorder(from, target)
  }

  // Once dragging, touch scrolling must be vetoed on the touchmove itself: touch-action cannot
  // change after the touch started. Bound to the mounted list node, which can appear after the
  // first render (the list is not rendered while it has no rows).
  useEffect(() => {
    if (!listNode) return
    const preventScroll = (event: TouchEvent) => {
      if (gestureRef.current.phase === 'dragging') event.preventDefault()
    }
    listNode.addEventListener('touchmove', preventScroll, { passive: false })
    return () => listNode.removeEventListener('touchmove', preventScroll)
  }, [listNode])

  useEffect(() => {
    const gesture = gestureRef
    return () => {
      window.clearTimeout(gesture.current.pressTimerId)
      window.clearInterval(gesture.current.scrollTimerId)
    }
  }, [])

  const handlePointerDown = (index: number, event: PointerEvent<HTMLElement>) => {
    const isPrimaryButton = event.pointerType !== 'mouse' || event.button === 0
    const isControl = event.target instanceof Element && event.target.closest(CONTROL_SELECTOR)
    if (!isPrimaryButton || isControl || gestureRef.current.phase !== 'idle') return
    gestureRef.current = {
      ...createIdleGesture(),
      phase: 'pending',
      row: event.currentTarget,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      clientY: event.clientY,
      from: index,
      pressTimerId: window.setTimeout(startDragging, LONG_PRESS_MS),
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current
    if (gesture.phase === 'idle' || event.pointerId !== gesture.pointerId) return
    gesture.clientY = event.clientY
    if (gesture.phase === 'dragging') return updateDrag()
    const moved = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY)
    if (moved > MOVE_TOLERANCE_PX) finishGesture(false)
  }

  const handleKeyDown = (index: number, rowCount: number, event: KeyboardEvent<HTMLElement>) => {
    if (!event.altKey || event.target !== event.currentTarget) return
    const step = KEY_STEPS[event.key]
    if (step === undefined) return
    const target = index + step
    if (target < 0 || target >= rowCount) return
    event.preventDefault()
    onReorder(index, target)
  }

  const getRowProps = (index: number, rowCount: number): RowProps => ({
    'data-reorder-row': '',
    'data-dragging': drag?.from === index,
    tabIndex: 0,
    style: getRowStyle(drag, index),
    onPointerDown: (event) => handlePointerDown(index, event),
    onPointerMove: handlePointerMove,
    onPointerUp: () => finishGesture(true),
    onPointerCancel: () => finishGesture(false),
    // A long press opens the context menu on some phones, which would end the drag.
    onContextMenu: (event) => event.preventDefault(),
    onKeyDown: (event) => handleKeyDown(index, rowCount, event),
  })

  return { listRef, getRowProps }
}
