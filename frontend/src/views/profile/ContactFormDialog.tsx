'use client'

import FormSheet from '@/components/form/FormSheet'
import TextField from '@/components/form/TextField'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { createContact, deleteContact, updateContact } from '@/services/profileApi'
import type { EmergencyContact } from '@/types/profile'
import DeleteRecordControl from '@/views/profile/DeleteRecordControl'

const FIELD_NAMES = ['name', 'phone_number', 'relationship'] as const
const NAME_MAX_LENGTH = 150
const PHONE_MAX_LENGTH = 32
const RELATIONSHIP_MAX_LENGTH = 64

interface ContactFormDialogProps {
  /** The contact being edited; without it the dialog adds a new one. */
  contact?: EmergencyContact
  onClose: () => void
  onSaved: () => void
}

/** Asks for the name, phone number and relationship of an emergency contact, empty or filled in from `contact`. */
export default function ContactFormDialog({ contact, onClose, onSaved }: ContactFormDialogProps) {
  const isEditing = contact !== undefined
  const { isPending, fieldErrors, formError, handleSubmit } = useFormSubmission(
    async (values) => {
      const content = {
        name: values.name.trim(),
        phone_number: values.phone_number.trim(),
        relationship: values.relationship.trim(),
      }
      if (contact) await updateContact(contact.id, content)
      else await createContact(content)
      onSaved()
    },
    FIELD_NAMES,
  )

  return (
    <FormSheet
      title={isEditing ? 'Edit contact' : 'New contact'}
      submitLabel={isEditing ? 'Save contact' : 'Add contact'}
      isPending={isPending}
      formError={formError}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <TextField
        name="name"
        label="Name"
        autoComplete="off"
        autoCapitalize="words"
        maxLength={NAME_MAX_LENGTH}
        defaultValue={contact?.name}
        error={fieldErrors.name}
      />
      <TextField
        name="phone_number"
        label="Phone number"
        type="tel"
        autoComplete="off"
        maxLength={PHONE_MAX_LENGTH}
        defaultValue={contact?.phone_number}
        error={fieldErrors.phone_number}
      />
      <TextField
        name="relationship"
        label="Relationship"
        autoComplete="off"
        autoCapitalize="words"
        maxLength={RELATIONSHIP_MAX_LENGTH}
        defaultValue={contact?.relationship}
        error={fieldErrors.relationship}
        isRequired={false}
      />
      {contact && (
        <DeleteRecordControl id={contact.id} recordName="contact" remove={deleteContact} onDeleted={onSaved} />
      )}
    </FormSheet>
  )
}
