'use client'

import { useEffect, useRef } from 'react'

import FormAlert from '@/components/form/FormAlert'
import SubmitButton from '@/components/form/SubmitButton'
import TextAreaField from '@/components/form/TextAreaField'
import TextField from '@/components/form/TextField'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { createRoute } from '@/services/routesApi'
import type { Coordinates } from '@/types/geolocation'
import type { SavedRoute } from '@/types/route'

const FIELD_NAMES = ['name', 'description'] as const
const NAME_MAX_LENGTH = 100
const DESCRIPTION_MAX_LENGTH = 255

interface SaveRouteDialogProps {
  isOpen: boolean
  path: readonly Coordinates[]
  onClose: () => void
  onSaved: (route: SavedRoute) => void
}

export default function SaveRouteDialog({ isOpen, path, onClose, onSaved }: SaveRouteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { isPending, fieldErrors, formError, handleSubmit } = useFormSubmission(
    async ({ name, description }) => {
      onSaved(await createRoute({ name: name.trim(), description: description.trim(), points: path }))
    },
    FIELD_NAMES,
  )

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  return (
    <dialog
      ref={dialogRef}
      className="sheet sheet-modal"
      aria-labelledby="save-route-title"
      onClose={onClose}
    >
      <span className="sheet-handle"></span>
      <div className="sheet-header">
        <h2 className="text-subtitle" id="save-route-title">
          Save route
        </h2>
        <button className="icon-button" type="button" aria-label="Close save route" onClick={onClose}>
          <span className="icon icon-x" aria-hidden="true"></span>
        </button>
      </div>
      <form className="stack-lg" onSubmit={handleSubmit}>
        <FormAlert message={formError} />
        <div className="stack">
          <TextField
            name="name"
            label="Name"
            autoComplete="off"
            maxLength={NAME_MAX_LENGTH}
            error={fieldErrors.name}
          />
          <TextAreaField
            name="description"
            label="Description (optional)"
            maxLength={DESCRIPTION_MAX_LENGTH}
            error={fieldErrors.description}
          />
        </div>
        <SubmitButton label="Save route" isPending={isPending} />
      </form>
    </dialog>
  )
}
