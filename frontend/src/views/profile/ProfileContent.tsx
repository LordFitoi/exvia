'use client'

import { useState } from 'react'

import { useAvatarUpload } from '@/hooks/useAvatarUpload'
import type { User } from '@/types/auth'
import type { Profile } from '@/types/profile'
import ProfileActions from '@/views/profile/ProfileActions'
import ProfileAccountSections from '@/views/profile/ProfileAccountSections'
import ProfileDetails from '@/views/profile/ProfileDetails'
import ProfileDialogHost from '@/views/profile/ProfileDialogHost'
import type { ProfileDialog } from '@/views/profile/ProfileDialogHost'
import ProfileHeader from '@/views/profile/ProfileHeader'

interface ProfileContentProps {
  user: User
  profile: Profile
  onReload: () => void
  onLogout: () => void
}

/** A loaded profile: title, header, the Edit and Share buttons, details and account, plus the form that is open. */
export default function ProfileContent({ user, profile, onReload, onLogout }: ProfileContentProps) {
  const [dialog, setDialog] = useState<ProfileDialog | null>(null)
  const { inputRef, isUploading, error, openPicker, handleChange } = useAvatarUpload(onReload)

  const handleSaved = () => {
    setDialog(null)
    onReload()
  }

  return (
    <main className="screen-body">
      <h1 className="text-heading">Profile</h1>
      <ProfileHeader
        username={user.username}
        avatar={profile.avatar}
        description={profile.description}
        isPhotoUploading={isUploading}
        photoError={error}
        onChangePhoto={openPicker}
      />
      <ProfileActions username={user.username} onEdit={() => setDialog({ kind: 'edit' })} />
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleChange} />
      <ProfileDetails profile={profile} onOpenDialog={setDialog} onChoosePhoto={openPicker} />
      <ProfileAccountSections email={user.email} isStaff={user.is_staff} onLogout={onLogout} />
      <ProfileDialogHost
        dialog={dialog}
        description={profile.description}
        bloodType={profile.blood_type}
        onClose={() => setDialog(null)}
        onSaved={handleSaved}
      />
    </main>
  )
}
