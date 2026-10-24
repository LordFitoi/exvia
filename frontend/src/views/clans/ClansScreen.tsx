'use client'

import { useState } from 'react'

import { useInvitationAnswer } from '@/hooks/useInvitationAnswer'
import { useRemoteList } from '@/hooks/useRemoteList'
import { fetchMyClans, fetchMyInvitations } from '@/services/clansApi'
import type { Clan } from '@/types/clan'
import ClanList from '@/views/clans/ClanList'
import ClanView from '@/views/clans/ClanView'
import CreateClanDialog from '@/views/clans/CreateClanDialog'
import InvitationList from '@/views/clans/InvitationList'

const CLANS_FAILURE_LABEL = 'Could not load the clans'
const INVITATIONS_FAILURE_LABEL = 'Could not load the invitations'

/** The Clans tab: pending invitations, the user's clans and a way to create one; opening a clan shows it. */
export default function ClansScreen() {
  const [openClan, setOpenClan] = useState<Clan | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const clans = useRemoteList(fetchMyClans, CLANS_FAILURE_LABEL)
  const invitations = useRemoteList(fetchMyInvitations, INVITATIONS_FAILURE_LABEL)
  const answer = useInvitationAnswer(() => {
    invitations.reload()
    clans.reload()
  })

  const handleCreated = (clan: Clan) => {
    setIsCreating(false)
    clans.reload()
    setOpenClan(clan)
  }

  const handleUpdated = (clan: Clan) => {
    clans.reload()
    setOpenClan(clan)
  }

  if (openClan) return <ClanView clan={openClan} onBack={() => setOpenClan(null)} onUpdated={handleUpdated} />

  return (
    <main className="screen-body">
      <div className="screen-header">
        <h1 className="text-heading">Clans</h1>
        <button className="button button-soft" type="button" onClick={() => setIsCreating(true)}>
          New clan
        </button>
      </div>
      <InvitationList
        invitations={invitations.items}
        pendingId={answer.pendingId}
        error={answer.error}
        onAccept={answer.accept}
        onDecline={answer.decline}
      />
      <ClanList
        status={clans.status}
        clans={clans.items}
        onSelect={setOpenClan}
        onRetry={clans.reload}
      />
      {isCreating && <CreateClanDialog onClose={() => setIsCreating(false)} onCreated={handleCreated} />}
    </main>
  )
}
