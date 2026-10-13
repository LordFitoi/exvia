'use client'

import StateView from '@/components/feedback/StateView'
import { useAuth } from '@/hooks/useAuth'

export default function HomeScreen() {
  const { user } = useAuth()

  return (
    <main className="screen-body">
      <div className="stack-sm">
        <h1 className="text-heading">Home</h1>
        <p className="text-small text-muted">Welcome back, {user?.username}.</p>
      </div>
      <section className="stack-sm" aria-labelledby="next-ride-title">
        <h2 className="text-overline" id="next-ride-title">
          Next ride
        </h2>
        <StateView
          title="No rides planned"
          description="When a clan you belong to schedules a ride, it shows up here."
        >
          <span className="icon icon-lg icon-calendar"></span>
        </StateView>
      </section>
      <section className="stack-sm" aria-labelledby="feed-title">
        <h2 className="text-overline" id="feed-title">
          From your clans
        </h2>
        <StateView
          title="Nothing new yet"
          description="Notices from your clans will appear in this feed."
        >
          <span className="icon icon-lg icon-bell"></span>
        </StateView>
      </section>
    </main>
  )
}
