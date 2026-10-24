'use client'

import { useRouter } from 'next/navigation'

import LoadFailedState from '@/components/feedback/LoadFailedState'
import StateView from '@/components/feedback/StateView'
import { useSharedProfile } from '@/hooks/useSharedProfile'
import GarageSection from '@/views/profile/GarageSection'
import ProfileHeader from '@/views/profile/ProfileHeader'

interface SharedProfileScreenProps {
  username: string
}

/** The profile of another rider as any signed-in rider sees it: photo, bio and garage, read only. */
export default function SharedProfileScreen({ username }: SharedProfileScreenProps) {
  const router = useRouter()
  const { status, profile, retry } = useSharedProfile(username)

  return (
    <main className="screen-body">
      <div className="screen-header">
        <button className="icon-button" type="button" aria-label="Back" onClick={() => router.back()}>
          <span className="icon icon-chevron-left" aria-hidden="true"></span>
        </button>
        <h1 className="text-heading">Profile</h1>
      </div>
      {status === 'loading' && (
        <div role="status" aria-busy="true">
          <span className="visually-hidden">Loading</span>
          <span className="skeleton skeleton-title" aria-hidden="true"></span>
          <span className="skeleton skeleton-line" aria-hidden="true"></span>
        </div>
      )}
      {status === 'failed' && <LoadFailedState title="Could not load this profile" onRetry={retry} />}
      {status === 'notFound' && (
        <StateView title="Rider not found" description={`There is no active rider called ${username}.`}>
          <span className="icon icon-lg icon-user"></span>
        </StateView>
      )}
      {profile && (
        <>
          <ProfileHeader username={profile.username} avatar={profile.avatar} description={profile.description} />
          <GarageSection vehicles={profile.vehicles} />
        </>
      )}
    </main>
  )
}
