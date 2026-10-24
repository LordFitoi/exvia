'use client'

import BloodTypeField from '@/components/form/BloodTypeField'
import FormSheet from '@/components/form/FormSheet'
import TextAreaField from '@/components/form/TextAreaField'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { updateProfile } from '@/services/profileApi'

const FIELD_NAMES = ['description', 'blood_type'] as const
const DESCRIPTION_MAX_LENGTH = 300

interface EditProfileDialogProps {
  description: string
  bloodType: string
  onClose: () => void
  onSaved: () => void
}

/** Asks for the bio and blood type of the profile, filled in with what it has now. */
export default function EditProfileDialog({ description, bloodType, onClose, onSaved }: EditProfileDialogProps) {
  const { isPending, fieldErrors, formError, handleSubmit } = useFormSubmission(
    async (values) => {
      await updateProfile({ description: values.description.trim(), blood_type: values.blood_type })
      onSaved()
    },
    FIELD_NAMES,
  )

  return (
    <FormSheet
      title="Edit profile"
      submitLabel="Save profile"
      isPending={isPending}
      formError={formError}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <TextAreaField
        name="description"
        label="Bio"
        maxLength={DESCRIPTION_MAX_LENGTH}
        defaultValue={description}
        error={fieldErrors.description}
      />
      <BloodTypeField name="blood_type" label="Blood type" defaultValue={bloodType} error={fieldErrors.blood_type} />
    </FormSheet>
  )
}
