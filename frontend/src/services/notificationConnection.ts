import { parseNotificationMessage } from '@/services/notificationMessages'
import type { NotificationMessage } from '@/services/notificationMessages'
import { startSocketConnection } from '@/services/socketConnection'

const NOTIFICATIONS_SOCKET_PATH = '/ws/notifications/'

interface NotificationConnectionOptions {
  onMessage: (message: NotificationMessage) => void
}

/** Opens the live channel of the signed-in user, which hears every new notification while the app is open. */
export const startNotificationConnection = ({ onMessage }: NotificationConnectionOptions) =>
  startSocketConnection({
    path: NOTIFICATIONS_SOCKET_PATH,
    parseMessage: parseNotificationMessage,
    onStatus: () => undefined,
    onMessage,
  })
