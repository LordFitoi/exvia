import ClansScreen from '@/views/clans/ClansScreen'

// Rendered behind AuthGuard, which shows a skeleton until the browser session resolves.
export const instant = false

export default function ClansPage() {
  return <ClansScreen />
}
