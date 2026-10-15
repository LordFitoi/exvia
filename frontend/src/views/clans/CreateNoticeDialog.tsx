'use client'

import FormSheet from '@/components/form/FormSheet'
import TextAreaField from '@/components/form/TextAreaField'
import TextField from '@/components/form/TextField'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { createClanNotice } from '@/services/clansApi'

const FIELD_NAMES = ['title', 'description'] as const
const TITLE_MAX_LENGTH = 150
const DESCRIPTION_MAX_LENGTH = 1000

interface CreateNoticeDialogProps {
  clanId: number
  onClose: () => void
  onCreated: () => void
}

/** Asks for the title and text of a notice for every member of the clan. */
export default function CreateNoticeDialog({ clanId, onClose, onCreated }: CreateNoticeDialogProps) {
  const { isPending, fieldErrors, formError, handleSubmit } = useFormSubmission(
    async ({ title, description }) => {
      await createClanNotice(clanId, { title: title.trim(), description: description.trim() })
      onCreated()
    },
    FIELD_NAMES,
  )

  return (
    <FormSheet
      title="New notice"
      submitLabel="Post notice"
      isPending={isPending}
      formError={formError}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <TextField
        name="title"
        label="Title"
        autoComplete="off"
        maxLength={TITLE_MAX_LENGTH}
        error={fieldErrors.title}
      />
      <TextAreaField
        name="description"
        label="Message"
        maxLength={DESCRIPTION_MAX_LENGTH}
        error={fieldErrors.description}
      />
    </FormSheet>
  )
}
