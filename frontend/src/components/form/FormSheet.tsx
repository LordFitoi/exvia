'use client'

import { useId } from 'react'
import type { FormEvent, ReactNode } from 'react'

import FormAlert from '@/components/form/FormAlert'
import SubmitButton from '@/components/form/SubmitButton'
import ModalHeader from '@/components/layout/ModalHeader'
import SheetHeader from '@/components/layout/SheetHeader'
import { useModalDialog } from '@/hooks/useModalDialog'

interface FormSheetProps {
  title: string
  submitLabel: string
  isPending: boolean
  formError: string | null
  /** A centered dialog instead of a bottom sheet, for forms that are a choice from a list. */
  isCentered?: boolean
  /** The fields of the form. */
  children: ReactNode
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}

/** A modal bottom sheet (or centered dialog) holding one form. Mount it to open it and unmount it to close it, so every opening starts empty. */
export default function FormSheet({
  title,
  submitLabel,
  isPending,
  formError,
  isCentered = false,
  children,
  onSubmit,
  onClose,
}: FormSheetProps) {
  const dialogRef = useModalDialog(true)
  const titleId = useId()
  const closeLabel = `Close ${title}`

  return (
    <dialog
      ref={dialogRef}
      className={isCentered ? 'dialog dialog-panel' : 'sheet sheet-modal'}
      aria-labelledby={titleId}
      onClose={onClose}
    >
      {isCentered ? (
        <ModalHeader titleId={titleId} title={title} closeLabel={closeLabel} onClose={onClose} />
      ) : (
        <SheetHeader
          titleId={titleId}
          title={title}
          closeLabel={closeLabel}
          sheetRef={dialogRef}
          onClose={onClose}
        />
      )}
      <form className="stack-lg" onSubmit={onSubmit}>
        <FormAlert message={formError} />
        <div className="stack">{children}</div>
        <SubmitButton label={submitLabel} isPending={isPending} />
      </form>
    </dialog>
  )
}
