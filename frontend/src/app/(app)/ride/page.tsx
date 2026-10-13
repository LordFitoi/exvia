import RideOverview from '@/views/ride/RideOverview'

// Rendered behind AuthGuard, which shows a skeleton until the browser session resolves.
export const instant = false

export default function RidePage() {
  return <RideOverview />
}
