'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, RefObject } from 'react'

import { placeMenuPanel } from '@/services/menuPlacement'

const MENU_ITEM_SELECTOR = '[role="menuitem"]'
const KEY_STEPS: Readonly<Record<string, number>> = { ArrowDown: 1, ArrowUp: -1 }

interface MenuPopoverOptions {
  /**
   * Shows the panel in the top layer, so a scrolling or clipping ancestor (a dialog) cannot cut it off.
   * Leave it off for a menu in plain flow, such as the map controls.
   */
  isInTopLayer?: boolean
}

interface MenuPanelProps {
  id: string
  role: 'menu'
  popover: 'manual' | undefined
  ref: RefObject<HTMLUListElement | null>
  onKeyDown: (event: KeyboardEvent<HTMLUListElement>) => void
}

interface MenuPopover {
  isOpen: boolean
  /** On the `menu` element that wraps the trigger and the panel. */
  rootRef: RefObject<HTMLDivElement | null>
  triggerRef: RefObject<HTMLButtonElement | null>
  /** Spread on the `menu-panel` list. */
  panelProps: MenuPanelProps
  toggle: () => void
  close: () => void
}

/**
 * The behavior of an action menu (WAI-ARIA menu button): the first item gets the focus when it opens,
 * a press outside closes it, Escape closes it and returns the focus to the button, and the arrow keys
 * move between the items. In the top layer it is placed next to the button, and closes if the screen
 * scrolls or resizes, because it would no longer sit next to it.
 */
export const useMenuPopover = ({ isInTopLayer = false }: MenuPopoverOptions = {}): MenuPopover => {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLUListElement>(null)
  const panelId = useId()

  useLayoutEffect(() => {
    const panel = panelRef.current
    const trigger = triggerRef.current
    if (!isOpen || !isInTopLayer || !panel || !trigger) return
    panel.showPopover()
    placeMenuPanel(trigger, panel)
  }, [isOpen, isInTopLayer])

  useEffect(() => {
    if (!isOpen) return
    rootRef.current?.querySelector<HTMLElement>(MENU_ITEM_SELECTOR)?.focus({ preventScroll: true })
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    const closeMenu = () => setIsOpen(false)
    document.addEventListener('pointerdown', closeOnOutsidePress)
    if (isInTopLayer) {
      window.addEventListener('resize', closeMenu)
      document.addEventListener('scroll', closeMenu, true)
    }
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      window.removeEventListener('resize', closeMenu)
      document.removeEventListener('scroll', closeMenu, true)
    }
  }, [isOpen, isInTopLayer])

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
    rootRef,
    triggerRef,
    panelProps: {
      id: panelId,
      role: 'menu',
      popover: isInTopLayer ? 'manual' : undefined,
      ref: panelRef,
      onKeyDown: handleKeyDown,
    },
    toggle: () => setIsOpen((previous) => !previous),
    close: () => setIsOpen(false),
  }
}
