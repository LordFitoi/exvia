'use client'

import type { EmergencyContact, Vehicle } from '@/types/profile'
import ContactFormDialog from '@/views/profile/ContactFormDialog'
import EditProfileDialog from '@/views/profile/EditProfileDialog'
import VehicleFormDialog from '@/views/profile/VehicleFormDialog'

/** Which form is open over the profile; `contact` and `vehicle` are set when editing one, absent when adding. */
export type ProfileDialog =
  | { readonly kind: 'edit' }
  | { readonly kind: 'contact'; readonly contact?: EmergencyContact }
  | { readonly kind: 'vehicle'; readonly vehicle?: Vehicle }

interface ProfileDialogHostProps {
  dialog: ProfileDialog | null
  description: string
  bloodType: string
  onClose: () => void
  onSaved: () => void
}

/** Mounts the form for the open dialog, so each opening starts from the record it edits. */
export default function ProfileDialogHost({
  dialog,
  description,
  bloodType,
  onClose,
  onSaved,
}: ProfileDialogHostProps) {
  if (!dialog) return null

  switch (dialog.kind) {
    case 'edit':
      return (
        <EditProfileDialog description={description} bloodType={bloodType} onClose={onClose} onSaved={onSaved} />
      )
    case 'contact':
      return <ContactFormDialog contact={dialog.contact} onClose={onClose} onSaved={onSaved} />
    case 'vehicle':
      return <VehicleFormDialog vehicle={dialog.vehicle} onClose={onClose} onSaved={onSaved} />
  }
}
