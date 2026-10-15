'use client'

import { useState } from 'react'

import type { Clan } from '@/types/clan'
import ClanMembersPanel from '@/views/clans/ClanMembersPanel'
import ClanNoticesPanel from '@/views/clans/ClanNoticesPanel'

type ClanTab = 'notices' | 'members'

const TABS: readonly { id: ClanTab; label: string }[] = [
  { id: 'notices', label: 'Notices' },
  { id: 'members', label: 'Members' },
]

interface ClanViewProps {
  clan: Clan
  onBack: () => void
}

/** One clan: its description, a Notices tab to read and post, and a Members tab to invite riders. */
export default function ClanView({ clan, onBack }: ClanViewProps) {
  const [tab, setTab] = useState<ClanTab>('notices')

  return (
    <main className="screen-body">
      <div className="screen-header">
        <button className="icon-button" type="button" aria-label="Back to clans" onClick={onBack}>
          <span className="icon icon-chevron-left" aria-hidden="true"></span>
        </button>
        <h1 className="text-heading">{clan.name}</h1>
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
      {tab === 'notices' ? <ClanNoticesPanel clanId={clan.id} /> : <ClanMembersPanel clanId={clan.id} />}
    </main>
  )
}
