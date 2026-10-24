'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import NoticeList from '@/components/clan/NoticeList'
import StateView from '@/components/feedback/StateView'
import { useActiveGroup } from '@/hooks/useActiveGroup'
import { useAuth } from '@/hooks/useAuth'
import { useRemoteList } from '@/hooks/useRemoteList'
import { useRouteInvitationAnswer } from '@/hooks/useRouteInvitationAnswer'
import { useRouteInvitations } from '@/hooks/useRouteInvitations'
import { fetchFeedNotices } from '@/services/clansApi'
import ActiveGroupSection from '@/views/home/ActiveGroupSection'
import NotificationsSheet from '@/views/home/NotificationsSheet'

const FEED_FAILURE_LABEL = 'Could not load the clan notices'

export default function HomeScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const feed = useRemoteList(fetchFeedNotices, FEED_FAILURE_LABEL)
  const invitations = useRouteInvitations()
  const { group: activeGroup } = useActiveGroup()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const answer = useRouteInvitationAnswer({
    onAccepted: (groupId) => router.push(`/ride/${groupId}`),
    onRejected: invitations.reload,
  })
  const { pendingCount } = invitations
  const bellLabel = pendingCount > 0 ? `Notifications, ${pendingCount} waiting for an answer` : 'Notifications'

  return (
    <main className="screen-body">
      <div className="stack-sm">
        <div className="screen-header">
          <h1 className="text-heading">Home</h1>
          <button
            className="icon-button icon-button-badged"
            type="button"
            aria-label={bellLabel}
            onClick={() => setIsNotificationsOpen(true)}
          >
            <span className="icon icon-bell" aria-hidden="true"></span>
            {pendingCount > 0 && (
              <span className="badge" aria-hidden="true">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
        <p className="text-small text-muted">Welcome back, {user?.username}.</p>
      </div>
      {activeGroup && (
        <ActiveGroupSection group={activeGroup} onJoin={() => router.push(`/ride/${activeGroup.id}`)} />
      )}
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
        <NoticeList
          status={feed.status}
          notices={feed.items}
          isClanShown
          emptyTitle="Nothing new yet"
          emptyDescription="Notices from your clans will appear in this feed."
          onRetry={feed.reload}
          onEdited={feed.reload}
        />
      </section>
      {isNotificationsOpen && (
        <NotificationsSheet
          invitations={invitations}
          answer={answer}
          onClose={() => setIsNotificationsOpen(false)}
        />
      )}
    </main>
  )
}
