'use client'

import FormAlert from '@/components/form/FormAlert'
import SubmitButton from '@/components/form/SubmitButton'
import TextAreaField from '@/components/form/TextAreaField'
import TextField from '@/components/form/TextField'
import SheetHeader from '@/components/layout/SheetHeader'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { useModalDialog } from '@/hooks/useModalDialog'
import type { NewRoute, RouteGeometry, SavedRoute } from '@/types/route'

const FIELD_NAMES = ['name', 'description'] as const
const NAME_MAX_LENGTH = 100
const DESCRIPTION_MAX_LENGTH = 255

interface SaveRouteDialogProps {
  isOpen: boolean
  /** `edit` saves changes to an existing route and starts with its name and description. */
  mode: 'create' | 'edit'
  geometry: RouteGeometry
  initialValues?: { name: string; description: string }
  saveRoute: (route: NewRoute) => Promise<SavedRoute>
  onClose: () => void
  onSaved: (route: SavedRoute) => void
}

const COPY = {
  create: { title: 'Save route', submitLabel: 'Save route', closeLabel: 'Close save route' },
  edit: { title: 'Save changes', submitLabel: 'Save changes', closeLabel: 'Close save changes' },
} as const

export default function SaveRouteDialog({
  isOpen,
  mode,
  geometry,
  initialValues,
  saveRoute,
  onClose,
  onSaved,
}: SaveRouteDialogProps) {
  const dialogRef = useModalDialog(isOpen)
  const { title, submitLabel, closeLabel } = COPY[mode]
  const { isPending, fieldErrors, formError, handleSubmit } = useFormSubmission(
    async ({ name, description }) => {
      onSaved(await saveRoute({ ...geometry, name: name.trim(), description: description.trim() }))
    },
    FIELD_NAMES,
  )

  return (
    <dialog
      ref={dialogRef}
      className="sheet sheet-modal"
      aria-labelledby="save-route-title"
      onClose={onClose}
    >
      <SheetHeader
        titleId="save-route-title"
        title={title}
        closeLabel={closeLabel}
        sheetRef={dialogRef}
        onClose={onClose}
      />
      <form className="stack-lg" onSubmit={handleSubmit}>
        <FormAlert message={formError} />
        <div className="stack">
          <TextField
            name="name"
            label="Name"
            autoComplete="off"
            maxLength={NAME_MAX_LENGTH}
            error={fieldErrors.name}
            defaultValue={initialValues?.name}
          />
          <TextAreaField
            name="description"
            label="Description (optional)"
            maxLength={DESCRIPTION_MAX_LENGTH}
            error={fieldErrors.description}
            defaultValue={initialValues?.description}
          />
        </div>
        <SubmitButton label={submitLabel} isPending={isPending} />
      </form>
    </dialog>
  )
}
