import RiderAvatar from '@/components/rider/RiderAvatar'
import { MAX_GROUP_RIDERS } from '@/services/groupRules'
import type { RiderProfile } from '@/types/routeGroup'

interface InvitationsSectionProps {
  invitees: readonly RiderProfile[]
  /** False once the group is full. */
  canAdd: boolean
  onAdd: () => void
  onRemove: (riderId: number) => void
}

/** The riders invited to the ride: each can be taken off, and more can be added until the group is full. */
export default function InvitationsSection({ invitees, canAdd, onAdd, onRemove }: InvitationsSectionProps) {
  return (
    <section aria-labelledby="ride-invitations-title">
      <div className="section-heading">
        <h2 id="ride-invitations-title">Invitations</h2>
        {canAdd && (
          <button className="link-action" type="button" onClick={onAdd}>
            Add
          </button>
        )}
      </div>
      {invitees.length === 0 ? (
        <p className="text-small text-muted">Riding solo. Add riders by username to ride together.</p>
      ) : (
        <ul className="list">
          {invitees.map((rider) => (
            <li className="list-item" key={rider.id}>
              <RiderAvatar rider={rider} size="sm" />
              <span className="list-item-body">
                <span className="list-item-title">{rider.username}</span>
              </span>
              <button
                className="icon-button"
                type="button"
                aria-label={`Remove ${rider.username}`}
                onClick={() => onRemove(rider.id)}
              >
                <span className="icon icon-trash" aria-hidden="true"></span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!canAdd && (
        <p className="text-small text-muted">A group has at most {MAX_GROUP_RIDERS} riders, you included.</p>
      )}
    </section>
  )
}
