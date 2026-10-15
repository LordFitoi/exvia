'use client'

import FormSheet from '@/components/form/FormSheet'
import TextAreaField from '@/components/form/TextAreaField'
import TextField from '@/components/form/TextField'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { createClan } from '@/services/clansApi'
import type { Clan } from '@/types/clan'

const FIELD_NAMES = ['name', 'description'] as const
const NAME_MAX_LENGTH = 100
const DESCRIPTION_MAX_LENGTH = 500

interface CreateClanDialogProps {
  onClose: () => void
  onCreated: (clan: Clan) => void
}

/** Asks for the name and description of a new clan; the creator owns it and is its first member. */
export default function CreateClanDialog({ onClose, onCreated }: CreateClanDialogProps) {
  const { isPending, fieldErrors, formError, handleSubmit } = useFormSubmission(
    async ({ name, description }) => {
      onCreated(await createClan({ name: name.trim(), description: description.trim() }))
    },
    FIELD_NAMES,
  )

  return (
    <FormSheet
      title="New clan"
      submitLabel="Create clan"
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
      />
      <TextAreaField
        name="description"
        label="Description"
        maxLength={DESCRIPTION_MAX_LENGTH}
        error={fieldErrors.description}
      />
    </FormSheet>
  )
}
