'use client'

import Toast from '@/components/feedback/Toast'
import FormAlert from '@/components/form/FormAlert'
import { useShareProfile } from '@/hooks/useShareProfile'
import { LINK_COPIED_MESSAGE, SHARE_FAILED_MESSAGE } from '@/hooks/useShareRoute'

interface ProfileActionsProps {
  /** The rider whose profile link is shared. */
  username: string
  onEdit: () => void
}

/** Under the header: two equal soft buttons, Edit profile and Share profile (copies the profile's address). */
export default function ProfileActions({ username, onEdit }: ProfileActionsProps) {
  const sharing = useShareProfile(username)

  return (
    <>
      <div className="button-row button-row-even">
        <button className="button button-soft" type="button" onClick={onEdit}>
          <span className="icon icon-sm icon-edit" aria-hidden="true"></span>
          Edit profile
        </button>
        <button className="button button-soft" type="button" onClick={sharing.copyLink}>
          <span className="icon icon-sm icon-share" aria-hidden="true"></span>
          Share profile
        </button>
      </div>
      <FormAlert message={sharing.hasFailed ? SHARE_FAILED_MESSAGE : null} />
      {sharing.isCopied && (
        <div className="toast-region">
          <Toast message={LINK_COPIED_MESSAGE} onDismiss={sharing.dismissCopied} />
        </div>
      )}
    </>
  )
}
