'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'

import { placeSuggestionList } from '@/services/suggestionPlacement'

interface SuggestionPopover {
  inputRef: RefObject<HTMLInputElement | null>
  listRef: RefObject<HTMLUListElement | null>
}

/**
 * Shows the suggestion list in the top layer while `isVisible`, under the input, so a dialog that
 * scrolls cannot cut it off. The list keeps to the part of the screen the phone keyboard leaves free
 * and scrolls inside itself; while it is open the page under it cannot be scrolled or panned. It calls
 * `onDismiss` when anything else scrolls, because the list would no longer sit under its input.
 */
export const useSuggestionPopover = (isVisible: boolean, onDismiss: () => void): SuggestionPopover => {
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useLayoutEffect(() => {
    const list = listRef.current
    const input = inputRef.current
    if (!list || !input) return
    const isShown = list.matches(':popover-open')
    if (!isVisible) {
      if (isShown) list.hidePopover()
      return
    }
    if (!isShown) list.showPopover()
    placeSuggestionList(input, list)
  })

  useEffect(() => {
    const list = listRef.current
    const input = inputRef.current
    if (!isVisible || !list || !input) return
    const replace = () => placeSuggestionList(input, list)
    const dismissOnOtherScroll = (event: Event) => {
      if (event.target !== list) onDismiss()
    }
    const blockPagePan = (event: TouchEvent) => {
      if (!(event.target instanceof Node && list.contains(event.target))) event.preventDefault()
    }
    const viewport = window.visualViewport
    window.addEventListener('resize', replace)
    viewport?.addEventListener('resize', replace)
    viewport?.addEventListener('scroll', replace)
    document.addEventListener('scroll', dismissOnOtherScroll, true)
    // Not passive: a passive listener cannot stop the touch from scrolling the page.
    document.addEventListener('touchmove', blockPagePan, { passive: false })
    return () => {
      window.removeEventListener('resize', replace)
      viewport?.removeEventListener('resize', replace)
      viewport?.removeEventListener('scroll', replace)
      document.removeEventListener('scroll', dismissOnOtherScroll, true)
      document.removeEventListener('touchmove', blockPagePan)
    }
  }, [isVisible, onDismiss])

  return { inputRef, listRef }
}
