import type { usePushNotifications } from '@/hooks/usePushNotifications'

interface PushNotificationsRowProps {
  push: ReturnType<typeof usePushNotifications>
}

/** Offers phone notifications while they are off, or says why they cannot be turned on; nothing otherwise. */
export default function PushNotificationsRow({ push }: PushNotificationsRowProps) {
  if (push.status === 'blocked') {
    return (
      <p className="text-small text-muted">
        Phone notifications are blocked. Allow them for this app in your browser settings.
      </p>
    )
  }
  if (push.status !== 'off') return null

  return (
    <ul className="list">
      <li className="list-item list-item-stacked">
        <span className="list-item-icon list-item-icon-primary" aria-hidden="true">
          <span className="icon icon-bell"></span>
        </span>
        <span className="list-item-body">
          <span className="list-item-title">Get notified on this phone</span>
          <span className="list-item-meta">Hear about invitations even when the app is closed.</span>
        </span>
        <div className="button-row">
          <button
            className={`button button-primary button-sm${push.isPending ? ' button-loading' : ''}`}
            type="button"
            disabled={push.isPending}
            aria-busy={push.isPending}
            onClick={push.enable}
          >
            Turn on
          </button>
        </div>
      </li>
    </ul>
  )
}
