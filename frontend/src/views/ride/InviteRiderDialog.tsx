'use client'

import FormSheet from '@/components/form/FormSheet'
import TextField from '@/components/form/TextField'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { ApiError } from '@/services/apiClient'
import { lookupRider } from '@/services/routeGroupApi'
import type { RiderProfile } from '@/types/routeGroup'

const FIELD_NAMES = ['username'] as const
const HTTP_NOT_FOUND = 404
const UNKNOWN_RIDER_MESSAGE = 'No rider with this username.'
const OWN_USERNAME_MESSAGE = 'You lead this ride already.'
const ALREADY_INVITED_MESSAGE = 'This rider is already invited.'

const fieldError = (status: number, message: string): ApiError =>
  new ApiError(status, message, { username: message })

interface InviteRiderDialogProps {
  /** The leader of the ride, who cannot invite themselves. */
  ownUsername: string
  invitees: readonly RiderProfile[]
  onClose: () => void
  /** Called with the rider that was found; the dialog does not close itself. */
  onAdded: (rider: RiderProfile) => void
}

/** Asks for the username of a rider to invite, and checks that they exist before adding them. */
export default function InviteRiderDialog({ ownUsername, invitees, onClose, onAdded }: InviteRiderDialogProps) {
  const { isPending, fieldErrors, formError, handleSubmit } = useFormSubmission(async ({ username }) => {
    const name = username.trim()
    if (name === ownUsername) throw fieldError(400, OWN_USERNAME_MESSAGE)
    if (invitees.some((rider) => rider.username === name)) throw fieldError(400, ALREADY_INVITED_MESSAGE)
    try {
      onAdded(await lookupRider(name))
    } catch (error) {
      if (error instanceof ApiError && error.status === HTTP_NOT_FOUND) throw fieldError(error.status, UNKNOWN_RIDER_MESSAGE)
      throw error
    }
  }, FIELD_NAMES)

  return (
    <FormSheet
      title="Invite a rider"
      submitLabel="Add rider"
      isPending={isPending}
      formError={formError}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <TextField
        name="username"
        label="Username"
        autoComplete="off"
        hint="They get the invitation when you press Ride."
        error={fieldErrors.username}
      />
    </FormSheet>
  )
}
