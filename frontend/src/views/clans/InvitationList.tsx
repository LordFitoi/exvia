import type { ClanInvitation } from '@/types/clan'

interface InvitationListProps {
  invitations: readonly ClanInvitation[]
  /** The invitation being answered, or null. */
  pendingId: number | null
  error: string | null
  onAccept: (id: number) => void
  onDecline: (id: number) => void
}

/** The invitations waiting for an answer, each with Decline and Join. */
export default function InvitationList({
  invitations,
  pendingId,
  error,
  onAccept,
  onDecline,
}: InvitationListProps) {
  if (invitations.length === 0) return null

  return (
    <section className="stack-sm" aria-labelledby="invitations-title">
      <h2 className="text-overline" id="invitations-title">
        Invitations
      </h2>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <ul className="list">
        {invitations.map(({ id, clan_name, invited_by }) => {
          const isPending = pendingId === id
          return (
            <li className="list-item" key={id}>
              <span className="list-item-body">
                <span className="list-item-title">{clan_name}</span>
                <span className="list-item-meta">Invited by {invited_by.username}</span>
              </span>
              <button
                className="button button-outline button-sm"
                type="button"
                disabled={pendingId !== null}
                onClick={() => onDecline(id)}
              >
                Decline
              </button>
              <button
                className={`button button-primary button-sm${isPending ? ' button-loading' : ''}`}
                type="button"
                disabled={pendingId !== null}
                aria-busy={isPending}
                onClick={() => onAccept(id)}
              >
                Join
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
