import MapOverview from '@/components/map/MapOverview'

// Rendered behind AuthGuard, which shows a skeleton until the browser session resolves.
export const instant = false

export default function MapPage() {
  return <MapOverview />
}
