import ProfileScreen from '@/components/profile/ProfileScreen'

// Rendered behind AuthGuard, which shows a skeleton until the browser session resolves.
export const instant = false

export default function ProfilePage() {
  return <ProfileScreen />
}
