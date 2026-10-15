'use client'

import { useId } from 'react'
import type { FormEvent, ReactNode } from 'react'

import FormAlert from '@/components/form/FormAlert'
import SubmitButton from '@/components/form/SubmitButton'
import { useModalDialog } from '@/hooks/useModalDialog'

interface FormSheetProps {
  title: string
  submitLabel: string
  isPending: boolean
  formError: string | null
  /** The fields of the form. */
  children: ReactNode
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}

/** A modal bottom sheet holding one form. Mount it to open it and unmount it to close it, so every opening starts empty. */
export default function FormSheet({
  title,
  submitLabel,
  isPending,
  formError,
  children,
  onSubmit,
  onClose,
}: FormSheetProps) {
  const dialogRef = useModalDialog(true)
  const titleId = useId()

  return (
    <dialog ref={dialogRef} className="sheet sheet-modal" aria-labelledby={titleId} onClose={onClose}>
      <span className="sheet-handle"></span>
      <div className="sheet-header">
        <h2 className="text-subtitle" id={titleId}>
          {title}
        </h2>
        <button className="icon-button" type="button" aria-label={`Close ${title}`} onClick={onClose}>
          <span className="icon icon-x" aria-hidden="true"></span>
        </button>
      </div>
      <form className="stack-lg" onSubmit={onSubmit}>
        <FormAlert message={formError} />
        <div className="stack">{children}</div>
        <SubmitButton label={submitLabel} isPending={isPending} />
      </form>
    </dialog>
  )
}
