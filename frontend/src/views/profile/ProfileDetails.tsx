import type { Profile, ProfileStep } from '@/types/profile'
import BloodTypeRow from '@/views/profile/BloodTypeRow'
import ContactsSection from '@/views/profile/ContactsSection'
import GarageSection from '@/views/profile/GarageSection'
import ProfileCompletionCard from '@/views/profile/ProfileCompletionCard'
import type { ProfileDialog } from '@/views/profile/ProfileDialogHost'

interface ProfileDetailsProps {
  profile: Profile
  onOpenDialog: (dialog: ProfileDialog) => void
  onChoosePhoto: () => void
}

/** What the rider filled in, after the header: completion, medical information, garage and contacts. */
export default function ProfileDetails({ profile, onOpenDialog, onChoosePhoto }: ProfileDetailsProps) {
  const handleStart = (step: ProfileStep) => {
    if (step === 'avatar') onChoosePhoto()
    else if (step === 'emergency_contact') onOpenDialog({ kind: 'contact' })
    else if (step === 'vehicle') onOpenDialog({ kind: 'vehicle' })
    else onOpenDialog({ kind: 'edit' })
  }

  return (
    <>
      <ProfileCompletionCard completion={profile.completion} onStart={handleStart} />
      <BloodTypeRow bloodType={profile.blood_type} />
      <GarageSection
        vehicles={profile.vehicles}
        onAdd={() => onOpenDialog({ kind: 'vehicle' })}
        onEdit={(vehicle) => onOpenDialog({ kind: 'vehicle', vehicle })}
      />
      <ContactsSection
        contacts={profile.emergency_contacts}
        onAdd={() => onOpenDialog({ kind: 'contact' })}
        onEdit={(contact) => onOpenDialog({ kind: 'contact', contact })}
      />
    </>
  )
}
