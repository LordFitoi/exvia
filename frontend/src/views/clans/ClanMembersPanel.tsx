'use client'

import { useState } from 'react'

import Toast from '@/components/feedback/Toast'
import { useClanMembers } from '@/hooks/useClanMembers'
import ClanMemberList from '@/views/clans/ClanMemberList'
import InviteMemberDialog from '@/views/clans/InviteMemberDialog'

interface ClanMembersPanelProps {
  clanId: number
}

/** The members of a clan, with the button that invites another rider. */
export default function ClanMembersPanel({ clanId }: ClanMembersPanelProps) {
  const [isInviting, setIsInviting] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)
  const members = useClanMembers(clanId)

  const handleInvited = (username: string) => {
    setIsInviting(false)
    setInviteMessage(`Invitation sent to ${username}.`)
  }

  return (
    <section className="stack" aria-label="Members">
      <button className="button button-primary button-block" type="button" onClick={() => setIsInviting(true)}>
        Invite a rider
      </button>
      <ClanMemberList status={members.status} members={members.items} onRetry={members.reload} />
      {isInviting && (
        <InviteMemberDialog clanId={clanId} onClose={() => setIsInviting(false)} onInvited={handleInvited} />
      )}
      {inviteMessage && <Toast message={inviteMessage} onDismiss={() => setInviteMessage(null)} />}
    </section>
  )
}
