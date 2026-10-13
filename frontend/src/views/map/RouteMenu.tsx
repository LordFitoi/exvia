'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

interface RouteMenuProps {
  onCreate: () => void
  onPreview: () => void
}

const MENU_ITEM_SELECTOR = '[role="menuitem"]'
const KEY_STEPS: Readonly<Record<string, number>> = { ArrowDown: 1, ArrowUp: -1 }

/** The route button of the map controls: opens a menu to create a route or browse the saved ones. */
export default function RouteMenu({ onCreate, onPreview }: RouteMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!isOpen) return
    rootRef.current?.querySelector<HTMLElement>(MENU_ITEM_SELECTOR)?.focus()
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePress)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress)
  }, [isOpen])

  const handleChoose = (action: () => void) => {
    setIsOpen(false)
    action()
  }

  // Escape closes and returns focus to the button; the arrow keys move between the items.
  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
      triggerRef.current?.focus()
      return
    }
    const step = KEY_STEPS[event.key]
    if (step === undefined) return
    event.preventDefault()
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR))
    const current = items.findIndex((item) => item === document.activeElement)
    items[(current + step + items.length) % items.length]?.focus()
  }

  return (
    <div className="menu" ref={rootRef}>
      <button
        ref={triggerRef}
        className="icon-button"
        type="button"
        aria-label="Routes"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => setIsOpen((previous) => !previous)}
      >
        <span className="icon icon-route" aria-hidden="true"></span>
      </button>
      {isOpen && (
        <ul className="menu-panel" id={panelId} role="menu" aria-label="Routes" onKeyDown={handleKeyDown}>
          <li role="none">
            <button className="menu-item" type="button" role="menuitem" onClick={() => handleChoose(onCreate)}>
              <span className="icon icon-plus" aria-hidden="true"></span>
              Create a new route
            </button>
          </li>
          <li role="none">
            <button className="menu-item" type="button" role="menuitem" onClick={() => handleChoose(onPreview)}>
              <span className="icon icon-list" aria-hidden="true"></span>
              Preview routes
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
