'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { useSheetGrab } from '@/hooks/useSheetGrab'

interface RouteSheetProps {
  statusLabel: string
  /** Always visible, even when the sheet is collapsed. */
  notice: ReactNode
  /** Hidden while the sheet is collapsed. */
  children: ReactNode
}

// Sliding the sheet down by the body's height (plus the gap above it) leaves the grab area, and
// the notice if there is one, visible at the bottom edge.
const measureCollapseOffset = (sheet: HTMLElement, body: HTMLElement): number =>
  body.offsetHeight + (parseFloat(getComputedStyle(sheet).rowGap) || 0)

export default function RouteSheet({ statusLabel, notice, children }: RouteSheetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { grabProps, handleToggleClick } = useSheetGrab({
    isCollapsed,
    onCollapsedChange: setIsCollapsed,
  })
  const bodyId = useId()
  const sheetRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [collapseOffset, setCollapseOffset] = useState(0)

  // The body grows and shrinks with the points, so the offset follows its size.
  useEffect(() => {
    const sheet = sheetRef.current
    const body = bodyRef.current
    if (!sheet || !body) return
    const observer = new ResizeObserver(() => setCollapseOffset(measureCollapseOffset(sheet, body)))
    observer.observe(body)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={sheetRef}
      className="sheet sheet-collapsible map-sheet"
      role="region"
      aria-label="Route points"
      style={isCollapsed ? { transform: `translateY(${collapseOffset}px)` } : undefined}
    >
      <div className="sheet-grab" {...grabProps}>
        <button
          className="sheet-handle"
          type="button"
          aria-label={isCollapsed ? 'Show route points' : 'Hide route points'}
          aria-expanded={!isCollapsed}
          aria-controls={bodyId}
          onClick={handleToggleClick}
        ></button>
        <div className="sheet-header">
          <h2 className="text-subtitle">New route</h2>
          <span className="badge badge-primary" aria-live="polite">
            {statusLabel}
          </span>
        </div>
      </div>
      {notice}
      <div ref={bodyRef} className="sheet-body" id={bodyId} inert={isCollapsed}>
        {children}
      </div>
    </div>
  )
}
