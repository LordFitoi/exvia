'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, RefObject } from 'react'

import { placeSuggestionList } from '@/services/suggestionPlacement'

const OPTION_SELECTOR = '[role="option"]'
const SELECTED_OPTION_SELECTOR = '[role="option"][aria-selected="true"]'
const KEY_STEPS: Readonly<Record<string, number>> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }

interface Dropdown {
  isOpen: boolean
  /** On the `details` element that wraps the summary and the menu. */
  rootRef: RefObject<HTMLDetailsElement | null>
  summaryRef: RefObject<HTMLElement | null>
  /** On the `dropdown-menu` list, which is shown in the top layer while open. */
  menuRef: RefObject<HTMLUListElement | null>
  toggle: () => void
  /** Closes the menu and returns the focus to the summary. */
  close: () => void
  handleMenuKeyDown: (event: KeyboardEvent<HTMLUListElement>) => void
}

/**
 * The behavior of the guide's custom dropdown: the menu opens in the top layer under the summary, so a
 * dialog that scrolls cannot cut it off, and the chosen option gets the focus. A press outside closes
 * it, Escape closes only the menu (not the dialog around it), the arrow keys move between the options,
 * and it closes when the screen resizes or scrolls, because it would no longer sit under the summary.
 */
export const useDropdown = (): Dropdown => {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDetailsElement>(null)
  const summaryRef = useRef<HTMLElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)

  useLayoutEffect(() => {
    const menu = menuRef.current
    const summary = summaryRef.current
    if (!isOpen || !menu || !summary) return
    menu.showPopover()
    placeSuggestionList(summary, menu)
    return () => {
      if (menu.matches(':popover-open')) menu.hidePopover()
    }
  }, [isOpen])

  useEffect(() => {
    const menu = menuRef.current
    if (!isOpen || !menu) return
    const target = menu.querySelector<HTMLElement>(SELECTED_OPTION_SELECTOR) ?? menu.querySelector<HTMLElement>(OPTION_SELECTOR)
    target?.focus({ preventScroll: true })
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    const closeOnScreenChange = (event: Event) => {
      if (event.target !== menu) setIsOpen(false)
    }
    const closeOnResize = () => setIsOpen(false)
    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('scroll', closeOnScreenChange, true)
    window.addEventListener('resize', closeOnResize)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('scroll', closeOnScreenChange, true)
      window.removeEventListener('resize', closeOnResize)
    }
  }, [isOpen])

  const close = () => {
    setIsOpen(false)
    summaryRef.current?.focus()
  }

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === 'Escape') {
      // Only the menu closes: inside a dialog, the same key must not close the dialog as well.
      event.preventDefault()
      event.stopPropagation()
      close()
      return
    }
    const step = KEY_STEPS[event.key]
    if (step === undefined) return
    event.preventDefault()
    const options = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(OPTION_SELECTOR))
    const current = options.findIndex((option) => option === document.activeElement)
    options[(current + step + options.length) % options.length]?.focus()
  }

  return { isOpen, rootRef, summaryRef, menuRef, toggle: () => setIsOpen((previous) => !previous), close, handleMenuKeyDown }
}
