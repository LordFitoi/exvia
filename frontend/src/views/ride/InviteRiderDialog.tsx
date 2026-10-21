'use client'

import FormSheet from '@/components/form/FormSheet'
import UsernameField from '@/components/form/UsernameField'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { ApiError } from '@/services/apiClient'
import { lookupRider } from '@/services/routeGroupApi'
import type { RiderProfile } from '@/types/routeGroup'

const FIELD_NAMES = ['username'] as const
const HTTP_NOT_FOUND = 404
const UNKNOWN_RIDER_MESSAGE = 'No rider with this username.'
const OWN_USERNAME_MESSAGE = 'You lead this ride already.'
const ALREADY_INVITED_MESSAGE = 'This rider is already invited.'
const SETUP_HINT = 'They get the invitation when you press Ride.'

const fieldError = (status: number, message: string): ApiError =>
  new ApiError(status, message, { username: message })

/** The rider with this username; an unknown name becomes an error of the username field. */
const findRider = async (username: string): Promise<RiderProfile> => {
  try {
    return await lookupRider(username)
  } catch (error) {
    if (error instanceof ApiError && error.status === HTTP_NOT_FOUND) throw fieldError(error.status, UNKNOWN_RIDER_MESSAGE)
    throw error
  }
}

interface InviteRiderDialogProps {
  /** The leader of the ride, who cannot invite themselves. */
  ownUsername: string
  invitees: readonly RiderProfile[]
  onClose: () => void
  /** What the field's hint says; by default that the invitation is sent when Ride is pressed. */
  hint?: string
  /** Called with the rider that was found; the dialog does not close itself. A failure is shown in the dialog. */
  onAdded: (rider: RiderProfile) => void | Promise<void>
}

/** Asks for the username of a rider to invite, and checks that they exist before adding them. */
export default function InviteRiderDialog({
  ownUsername,
  invitees,
  hint = SETUP_HINT,
  onClose,
  onAdded,
}: InviteRiderDialogProps) {
  const { isPending, fieldErrors, formError, handleSubmit } = useFormSubmission(async ({ username }) => {
    const name = username.trim()
    if (name === ownUsername) throw fieldError(400, OWN_USERNAME_MESSAGE)
    if (invitees.some((rider) => rider.username === name)) throw fieldError(400, ALREADY_INVITED_MESSAGE)
    await onAdded(await findRider(name))
  }, FIELD_NAMES)

  const invitedUsernames = invitees.map((rider) => rider.username)

  return (
    <FormSheet
      title="Invite a rider"
      submitLabel="Add rider"
      isPending={isPending}
      formError={formError}
      isCentered
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <UsernameField
        name="username"
        label="Username"
        hint={hint}
        error={fieldErrors.username}
        excludedUsernames={invitedUsernames}
      />
    </FormSheet>
  )
}
