'use client'

import LoadFailedState from '@/components/feedback/LoadFailedState'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import ProfileContent from '@/views/profile/ProfileContent'

function ProfileSkeleton() {
  return (
    <main className="screen-body" role="status" aria-busy="true">
      <span className="visually-hidden">Loading</span>
      <span className="skeleton skeleton-title" aria-hidden="true"></span>
      <span className="skeleton skeleton-line" aria-hidden="true"></span>
      <span className="skeleton skeleton-line" aria-hidden="true"></span>
    </main>
  )
}

export default function ProfileScreen() {
  const { user, logout } = useAuth()
  const { status, profile, reload, retry } = useProfile()
  if (!user) return null
  if (status === 'failed') {
    return (
      <main className="screen-body">
        <LoadFailedState title="Could not load your profile" onRetry={retry} />
      </main>
    )
  }
  if (!profile) return <ProfileSkeleton />

  return <ProfileContent user={user} profile={profile} onReload={reload} onLogout={logout} />
}
