'use client'

import { useRouter } from 'next/navigation'

import LoadFailedState from '@/components/feedback/LoadFailedState'
import LoadingScreen from '@/components/feedback/LoadingScreen'
import { useRouteGroup } from '@/hooks/useRouteGroup'
import GroupRideView from '@/views/ride/GroupRideView'

const MAP_PATH = '/map'

interface JoinedRideViewProps {
  /** The group the rider was taken into by accepting its invitation. */
  groupId: string
}

/** Opens the ride of a group the rider joined: loads the group, then rides in it at once. */
export default function JoinedRideView({ groupId }: JoinedRideViewProps) {
  const router = useRouter()
  const { status, group, retry } = useRouteGroup(groupId)
  // Replacing the screen keeps Back from returning to a ride that is over or left.
  const handleExit = () => router.replace(MAP_PATH)

  if (status === 'failed') {
    return (
      <main className="screen-body">
        <LoadFailedState title="Could not open this ride" onRetry={retry} />
      </main>
    )
  }
  if (!group) return <LoadingScreen />

  return <GroupRideView group={group} onLeave={handleExit} onFinish={handleExit} />
}
