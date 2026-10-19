'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

const stopCloseEvent = (event: Event) => event.stopImmediatePropagation()

/**
 * Opens the native `<dialog>` with `showModal()` while `isOpen` is true. The dialog is closed again
 * when `isOpen` turns false and when the screen goes away: a modal left open keeps blocking the whole
 * document, even inside a route that Next only hides (cacheComponents) instead of unmounting.
 */
export const useModalDialog = (isOpen: boolean): RefObject<HTMLDialogElement | null> => {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !isOpen) return

    if (!dialog.open) dialog.showModal()
    return () => {
      if (!dialog.open) return
      // The owner already knows it is closing the dialog, so its `onClose` must not run for it.
      dialog.addEventListener('close', stopCloseEvent, { capture: true, once: true })
      dialog.close()
    }
  }, [isOpen])

  return dialogRef
}
