'use client'

import { useState } from 'react'

import { useAuth } from '@/hooks/useAuth'
import type { Clan } from '@/types/clan'
import ClanEventsPanel from '@/views/clans/ClanEventsPanel'
import ClanMembersPanel from '@/views/clans/ClanMembersPanel'
import ClanNoticesPanel from '@/views/clans/ClanNoticesPanel'
import EditClanDialog from '@/views/clans/EditClanDialog'

type ClanTab = 'notices' | 'events' | 'members'

const TABS: readonly { id: ClanTab; label: string }[] = [
  { id: 'notices', label: 'Notices' },
  { id: 'events', label: 'Events' },
  { id: 'members', label: 'Members' },
]

interface ClanViewProps {
  clan: Clan
  onBack: () => void
  /** Called with the clan as the admin saved it. */
  onUpdated: (clan: Clan) => void
}

/** One clan: its description, an Edit button for its admin, a Notices tab to read and post, an Events tab with the scheduled rides, and a Members tab to invite riders. */
export default function ClanView({ clan, onBack, onUpdated }: ClanViewProps) {
  const { user } = useAuth()
  const [tab, setTab] = useState<ClanTab>('notices')
  const [isEditing, setIsEditing] = useState(false)
  const isAdmin = user?.id === clan.owner

  const handleSaved = (updated: Clan) => {
    setIsEditing(false)
    onUpdated(updated)
  }

  return (
    <main className="screen-body">
      <div className="screen-header">
        <button className="icon-button" type="button" aria-label="Back to clans" onClick={onBack}>
          <span className="icon icon-chevron-left" aria-hidden="true"></span>
        </button>
        <h1 className="text-heading clan-title">{clan.name}</h1>
        {isAdmin && (
          <button
            className="icon-button"
            type="button"
            aria-label={`Edit clan ${clan.name}`}
            onClick={() => setIsEditing(true)}
          >
            <span className="icon icon-edit" aria-hidden="true"></span>
          </button>
        )}
      </div>
      <p className="text-small text-muted">{clan.description}</p>
      <div className="tabs" role="tablist" aria-label="Clan sections">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            className="tab"
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'notices' && <ClanNoticesPanel clanId={clan.id} />}
      {tab === 'events' && <ClanEventsPanel clanId={clan.id} isAdmin={isAdmin} />}
      {tab === 'members' && <ClanMembersPanel clanId={clan.id} />}
      {isEditing && <EditClanDialog clan={clan} onClose={() => setIsEditing(false)} onSaved={handleSaved} />}
    </main>
  )
}
