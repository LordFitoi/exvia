'use client'

import type { RefObject } from 'react'

import ModalHeader from '@/components/layout/ModalHeader'
import { useSheetDragClose } from '@/hooks/useSheetDragClose'

interface SheetHeaderProps {
  titleId: string
  title: string
  closeLabel: string
  /** The modal sheet this header belongs to; dragging the header down moves and closes it. */
  sheetRef: RefObject<HTMLElement | null>
  onClose: () => void
}

/** The header of a modal sheet, and the area the sheet is dragged down by. */
export default function SheetHeader({ titleId, title, closeLabel, sheetRef, onClose }: SheetHeaderProps) {
  const grabProps = useSheetDragClose(sheetRef, onClose)

  return (
    <div className="sheet-grab" {...grabProps}>
      <ModalHeader titleId={titleId} title={title} closeLabel={closeLabel} onClose={onClose} />
    </div>
  )
}
