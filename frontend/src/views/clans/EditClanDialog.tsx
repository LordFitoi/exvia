'use client'

import FormSheet from '@/components/form/FormSheet'
import TextAreaField from '@/components/form/TextAreaField'
import TextField from '@/components/form/TextField'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { updateClan } from '@/services/clansApi'
import type { Clan } from '@/types/clan'

const FIELD_NAMES = ['name', 'description'] as const
const NAME_MAX_LENGTH = 100
const DESCRIPTION_MAX_LENGTH = 500

interface EditClanDialogProps {
  clan: Clan
  onClose: () => void
  onSaved: (clan: Clan) => void
}

/** Asks for a new name and description of a clan, filled in with the current ones; only its admin opens it. */
export default function EditClanDialog({ clan, onClose, onSaved }: EditClanDialogProps) {
  const { isPending, fieldErrors, formError, handleSubmit } = useFormSubmission(
    async ({ name, description }) => {
      onSaved(await updateClan(clan.id, { name: name.trim(), description: description.trim() }))
    },
    FIELD_NAMES,
  )

  return (
    <FormSheet
      title="Edit clan"
      submitLabel="Save clan"
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
        defaultValue={clan.name}
        error={fieldErrors.name}
      />
      <TextAreaField
        name="description"
        label="Description"
        maxLength={DESCRIPTION_MAX_LENGTH}
        defaultValue={clan.description}
        error={fieldErrors.description}
      />
    </FormSheet>
  )
}
