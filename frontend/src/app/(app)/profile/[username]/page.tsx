import { Suspense } from 'react'

import LoadingScreen from '@/components/feedback/LoadingScreen'
import SharedProfileScreen from '@/views/profile/SharedProfileScreen'

// Rendered behind AuthGuard, which shows a skeleton until the browser session resolves.
export const instant = false

type SharedProfilePageProps = PageProps<'/profile/[username]'>

/** A username as it was in the link: usernames never contain "%", so a malformed escape is kept as typed. */
const decodeUsername = (segment: string): string => {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

async function SharedProfileContent({ params }: Pick<SharedProfilePageProps, 'params'>) {
  const { username } = await params
  return <SharedProfileScreen username={decodeUsername(username)} />
}

/** What a signed-in rider sees of another rider, at the link that Share profile copies. */
export default function SharedProfilePage({ params }: SharedProfilePageProps) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SharedProfileContent params={params} />
    </Suspense>
  )
}
