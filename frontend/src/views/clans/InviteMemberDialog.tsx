'use client'

import FormSheet from '@/components/form/FormSheet'
import TextField from '@/components/form/TextField'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { inviteToClan } from '@/services/clansApi'

const FIELD_NAMES = ['username'] as const

interface InviteMemberDialogProps {
  clanId: number
  onClose: () => void
  /** Called with the username that was invited. */
  onInvited: (username: string) => void
}

/** Asks for the username of the rider to invite; they join once they accept. */
export default function InviteMemberDialog({ clanId, onClose, onInvited }: InviteMemberDialogProps) {
  const { isPending, fieldErrors, formError, handleSubmit } = useFormSubmission(
    async ({ username }) => {
      const invitee = username.trim()
      await inviteToClan(clanId, invitee)
      onInvited(invitee)
    },
    FIELD_NAMES,
  )

  return (
    <FormSheet
      title="Invite a rider"
      submitLabel="Send invitation"
      isPending={isPending}
      formError={formError}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <TextField
        name="username"
        label="Username"
        autoComplete="off"
        hint="They join the clan when they accept."
        error={fieldErrors.username}
      />
    </FormSheet>
  )
}
