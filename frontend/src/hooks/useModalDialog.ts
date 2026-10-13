'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

/** Opens the native `<dialog>` with `showModal()` while `isOpen` is true and closes it after. */
export const useModalDialog = (isOpen: boolean): RefObject<HTMLDialogElement | null> => {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  return dialogRef
}
