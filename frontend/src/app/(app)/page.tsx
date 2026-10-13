import HomeScreen from '@/views/home/HomeScreen'

// Rendered behind AuthGuard, which shows a skeleton until the browser session resolves.
export const instant = false

export default function HomePage() {
  return <HomeScreen />
}
