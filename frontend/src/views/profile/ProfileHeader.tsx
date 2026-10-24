import Image from 'next/image'

import FormAlert from '@/components/form/FormAlert'
import { getInitials } from '@/services/riderInitials'

const AVATAR_PIXELS = 100

interface ProfileHeaderProps {
  username: string
  /** Path of the profile photo, or null for the initials. */
  avatar: string | null
  description: string
  isPhotoUploading?: boolean
  /** Why the last photo could not be uploaded, or null. */
  photoError?: string | null
  /** Shows the round edit button on the photo; leave it out to show the photo of another rider. */
  onChangePhoto?: () => void
}

/** The rider's photo (changed with the edit button on it, when `onChangePhoto` is given), name and bio. */
export default function ProfileHeader({
  username,
  avatar,
  description,
  isPhotoUploading = false,
  photoError = null,
  onChangePhoto,
}: ProfileHeaderProps) {
  return (
    <div className="profile-header">
      <div className="profile-avatar">
        <span className="avatar avatar-xl" aria-hidden="true">
          {avatar ? (
            <Image src={avatar} alt="" width={AVATAR_PIXELS} height={AVATAR_PIXELS} unoptimized />
          ) : (
            getInitials(username)
          )}
        </span>
        {onChangePhoto && (
          <button
            className="icon-button profile-avatar-edit"
            type="button"
            aria-label="Change photo"
            disabled={isPhotoUploading}
            onClick={onChangePhoto}
          >
            <span className="icon icon-sm icon-edit" aria-hidden="true"></span>
          </button>
        )}
      </div>
      <h2 className="profile-name">{username}</h2>
      {description && <p className="profile-bio">{description}</p>}
      <FormAlert message={photoError} />
    </div>
  )
}
