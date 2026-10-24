'use client'

import { useState } from 'react'

import NoticeRoutePicker from '@/components/clan/NoticeRoutePicker'
import FormSheet from '@/components/form/FormSheet'
import TextAreaField from '@/components/form/TextAreaField'
import TextField from '@/components/form/TextField'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { createClanEvent } from '@/services/clansApi'

const FIELD_NAMES = ['title', 'description', 'scheduled_at'] as const
const TITLE_MAX_LENGTH = 150
const DESCRIPTION_MAX_LENGTH = 1000

interface EventFormDialogProps {
  clanId: number
  onClose: () => void
  onSaved: () => void
}

/** Asks the clan admin for the title, time and route of a ride; the clan gets a notice and the ride starts on time. */
export default function EventFormDialog({ clanId, onClose, onSaved }: EventFormDialogProps) {
  const [routeId, setRouteId] = useState<string | null>(null)
  const { isPending, fieldErrors, formError, handleSubmit } = useFormSubmission(
    async ({ title, description, scheduled_at: scheduledAt }) => {
      await createClanEvent(clanId, {
        title: title.trim(),
        description: description.trim(),
        route_id: routeId,
        scheduled_at: new Date(scheduledAt).toISOString(),
      })
      onSaved()
    },
    FIELD_NAMES,
  )

  return (
    <FormSheet
      title="Schedule a ride"
      submitLabel="Schedule ride"
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
      <TextField
        name="scheduled_at"
        label="Date and time"
        type="datetime-local"
        autoComplete="off"
        error={fieldErrors.scheduled_at}
      />
      <NoticeRoutePicker selectedId={routeId} onSelect={setRouteId} />
    </FormSheet>
  )
}
