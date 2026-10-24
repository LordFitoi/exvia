'use client'

import { useState } from 'react'

import ClanEventCard from '@/components/clan/ClanEventCard'
import LoadFailedState from '@/components/feedback/LoadFailedState'
import StateView from '@/components/feedback/StateView'
import { useClanEvents } from '@/hooks/useClanEvents'
import EventFormDialog from '@/views/clans/EventFormDialog'

interface ClanEventsPanelProps {
  clanId: number
  /** Only the admin of the clan schedules rides. */
  isAdmin: boolean
}

/** The scheduled rides of a clan, latest first, with the button that schedules one for its admin. */
export default function ClanEventsPanel({ clanId, isAdmin }: ClanEventsPanelProps) {
  const [isScheduling, setIsScheduling] = useState(false)
  const events = useClanEvents(clanId)

  const handleSaved = () => {
    setIsScheduling(false)
    events.reload()
  }

  return (
    <section className="stack" aria-label="Events">
      {isAdmin && (
        <button className="button button-primary button-block" type="button" onClick={() => setIsScheduling(true)}>
          Schedule a ride
        </button>
      )}
      {events.status === 'loading' && (
        <p className="text-small text-muted" role="status">
          Loading…
        </p>
      )}
      {events.status === 'failed' && <LoadFailedState title="Could not load the events" onRetry={events.reload} />}
      {events.status === 'ready' && events.items.length === 0 && (
        <StateView
          title="No rides scheduled"
          description={isAdmin ? 'Schedule a ride and the members can join it when it starts.' : 'The admin of the clan schedules the rides.'}
        >
          <span className="icon icon-lg icon-calendar"></span>
        </StateView>
      )}
      {events.items.map((event) => (
        <ClanEventCard key={event.id} event={event} />
      ))}
      {isScheduling && (
        <EventFormDialog clanId={clanId} onClose={() => setIsScheduling(false)} onSaved={handleSaved} />
      )}
    </section>
  )
}
