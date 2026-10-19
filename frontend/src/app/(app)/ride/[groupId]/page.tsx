import { Suspense } from 'react'

import LoadingScreen from '@/components/feedback/LoadingScreen'
import JoinedRideView from '@/views/ride/JoinedRideView'

// Rendered behind AuthGuard, which shows a skeleton until the browser session resolves.
export const instant = false

type GroupRidePageProps = PageProps<'/ride/[groupId]'>

async function GroupRideContent({ params }: Pick<GroupRidePageProps, 'params'>) {
  const { groupId } = await params
  return <JoinedRideView groupId={groupId} />
}

/** Where accepting an invitation lands: the ride of that group, started at once. */
export default function GroupRidePage({ params }: GroupRidePageProps) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <GroupRideContent params={params} />
    </Suspense>
  )
}
