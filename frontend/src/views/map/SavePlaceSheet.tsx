'use client'

import CategoryField from '@/components/form/CategoryField'
import FormSheet from '@/components/form/FormSheet'
import TextAreaField from '@/components/form/TextAreaField'
import TextField from '@/components/form/TextField'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { DEFAULT_PLACE_LOCATION_CATEGORY, isPlaceLocationCategory } from '@/services/placeLocationCategories'
import { createPlaceLocation } from '@/services/placeLocationsApi'
import type { PlaceLocation, SavePlaceRequest } from '@/types/placeLocation'

const FIELD_NAMES = ['name', 'category', 'notes'] as const
const NAME_MAX_LENGTH = 100
const NOTES_MAX_LENGTH = 500

interface SavePlaceSheetProps {
  request: SavePlaceRequest
  onSaved: (place: PlaceLocation) => void
  onClose: () => void
}

/** The sheet that names a spot, picks its kind and takes personal notes, then saves it as a favorite place. */
export default function SavePlaceSheet({ request, onSaved, onClose }: SavePlaceSheetProps) {
  const { isPending, fieldErrors, formError, handleSubmit } = useFormSubmission(
    async ({ name, category, notes }) => {
      onSaved(
        await createPlaceLocation({
          name: name.trim(),
          notes: notes.trim(),
          category: isPlaceLocationCategory(category) ? category : DEFAULT_PLACE_LOCATION_CATEGORY,
          coordinates: request.coordinates,
        }),
      )
    },
    FIELD_NAMES,
  )

  return (
    <FormSheet
      title="Save place"
      submitLabel="Save place"
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
        defaultValue={request.suggestedName}
      />
      <CategoryField name="category" label="Category" error={fieldErrors.category} />
      <TextAreaField name="notes" label="Notes (optional)" maxLength={NOTES_MAX_LENGTH} error={fieldErrors.notes} />
    </FormSheet>
  )
}
