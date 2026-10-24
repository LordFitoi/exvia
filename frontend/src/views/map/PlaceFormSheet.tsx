'use client'

import CategoryField from '@/components/form/CategoryField'
import FormSheet from '@/components/form/FormSheet'
import TextAreaField from '@/components/form/TextAreaField'
import TextField from '@/components/form/TextField'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { DEFAULT_PLACE_LOCATION_CATEGORY, isPlaceLocationCategory } from '@/services/placeLocationCategories'
import type { PlaceDetails } from '@/types/placeLocation'

const FIELD_NAMES = ['name', 'category', 'notes'] as const
const NAME_MAX_LENGTH = 100
const NOTES_MAX_LENGTH = 500

interface PlaceFormSheetProps {
  title: string
  submitLabel: string
  /** What the fields start with. */
  initial: PlaceDetails
  /** Saves the details; a failure from the API is shown on the form. */
  onSubmit: (details: PlaceDetails) => Promise<void>
  onClose: () => void
}

/** The sheet that names a place, picks its kind and takes personal notes. */
export default function PlaceFormSheet({ title, submitLabel, initial, onSubmit, onClose }: PlaceFormSheetProps) {
  const { isPending, fieldErrors, formError, handleSubmit } = useFormSubmission(
    ({ name, category, notes }) =>
      onSubmit({
        name: name.trim(),
        notes: notes.trim(),
        category: isPlaceLocationCategory(category) ? category : DEFAULT_PLACE_LOCATION_CATEGORY,
      }),
    FIELD_NAMES,
  )

  return (
    <FormSheet
      title={title}
      submitLabel={submitLabel}
      isPending={isPending}
      formError={formError}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <TextField
        name="name"
        label="Name"
        autoComplete="off"
        maxLength={NAME_MAX_LENGTH}
        error={fieldErrors.name}
        defaultValue={initial.name}
      />
      <CategoryField name="category" label="Category" error={fieldErrors.category} defaultValue={initial.category} />
      <TextAreaField
        name="notes"
        label="Notes (optional)"
        maxLength={NOTES_MAX_LENGTH}
        error={fieldErrors.notes}
        defaultValue={initial.notes}
      />
    </FormSheet>
  )
}
