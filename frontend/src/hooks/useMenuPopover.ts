'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, RefObject } from 'react'

const MENU_ITEM_SELECTOR = '[role="menuitem"]'
const KEY_STEPS: Readonly<Record<string, number>> = { ArrowDown: 1, ArrowUp: -1 }

interface MenuPopover {
  isOpen: boolean
  panelId: string
  /** On the `menu` element that wraps the trigger and the panel. */
  rootRef: RefObject<HTMLDivElement | null>
  triggerRef: RefObject<HTMLButtonElement | null>
  toggle: () => void
  close: () => void
  /** On the `menu-panel` list. */
  handleKeyDown: (event: KeyboardEvent<HTMLUListElement>) => void
}

/**
 * The behavior of an action menu (WAI-ARIA menu button): the first item gets the focus when it opens,
 * a press outside closes it, Escape closes it and returns the focus to the button, and the arrow keys
 * move between the items.
 */
export const useMenuPopover = (): MenuPopover => {
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

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === 'Escape') {
      // Only the menu closes: inside a dialog, the same key must not close the dialog as well.
      event.preventDefault()
      event.stopPropagation()
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

  return {
    isOpen,
    panelId,
    rootRef,
    triggerRef,
    toggle: () => setIsOpen((previous) => !previous),
    close: () => setIsOpen(false),
    handleKeyDown,
  }
}
