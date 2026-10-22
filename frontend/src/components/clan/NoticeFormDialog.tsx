'use client'

import { useState } from 'react'

import NoticeRoutePicker from '@/components/clan/NoticeRoutePicker'
import FormSheet from '@/components/form/FormSheet'
import TextAreaField from '@/components/form/TextAreaField'
import TextField from '@/components/form/TextField'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { createClanNotice, updateClanNotice } from '@/services/clansApi'
import type { ClanNotice } from '@/types/clan'

const FIELD_NAMES = ['title', 'description'] as const
const TITLE_MAX_LENGTH = 150
const DESCRIPTION_MAX_LENGTH = 1000

interface NoticeFormDialogProps {
  clanId: number
  /** The notice being edited; without it the dialog posts a new one. */
  notice?: ClanNotice
  onClose: () => void
  onSaved: () => void
}

/** Asks for the title, text and optional route of a notice for every member of the clan, empty or filled in from `notice`. */
export default function NoticeFormDialog({ clanId, notice, onClose, onSaved }: NoticeFormDialogProps) {
  const [routeId, setRouteId] = useState<string | null>(notice?.route?.id ?? null)
  const isEditing = notice !== undefined
  const { isPending, fieldErrors, formError, handleSubmit } = useFormSubmission(
    async ({ title, description }) => {
      const content = { title: title.trim(), description: description.trim(), route_id: routeId }
      if (notice) await updateClanNotice(clanId, notice.id, content)
      else await createClanNotice(clanId, content)
      onSaved()
    },
    FIELD_NAMES,
  )

  return (
    <FormSheet
      title={isEditing ? 'Edit notice' : 'New notice'}
      submitLabel={isEditing ? 'Save notice' : 'Post notice'}
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
        defaultValue={notice?.title}
        error={fieldErrors.title}
      />
      <TextAreaField
        name="description"
        label="Message"
        maxLength={DESCRIPTION_MAX_LENGTH}
        defaultValue={notice?.description}
        error={fieldErrors.description}
      />
      <NoticeRoutePicker selectedId={routeId} onSelect={setRouteId} />
    </FormSheet>
  )
}
