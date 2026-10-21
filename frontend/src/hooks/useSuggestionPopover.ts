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
 * scrolls cannot cut it off. It calls `onDismiss` on scroll and resize, because the list would no
 * longer sit under its input.
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
    if (!isVisible) return
    window.addEventListener('resize', onDismiss)
    document.addEventListener('scroll', onDismiss, true)
    return () => {
      window.removeEventListener('resize', onDismiss)
      document.removeEventListener('scroll', onDismiss, true)
    }
  }, [isVisible, onDismiss])

  return { inputRef, listRef }
}
