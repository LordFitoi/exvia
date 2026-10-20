import { startSocketConnection } from '@/services/socketConnection'
import type { ConnectionStatus } from '@/services/socketConnection'
import { parseGroupMessage } from '@/services/groupMessages'
import type { GroupMessage } from '@/services/groupMessages'

export type { ConnectionStatus }

interface GroupConnectionOptions {
  groupId: string
  onStatus: (status: ConnectionStatus) => void
  onMessage: (message: GroupMessage) => void
}

/** Opens the live channel of a group; see `startSocketConnection` for how it signs in and reconnects. */
export const startGroupConnection = ({ groupId, onStatus, onMessage }: GroupConnectionOptions) =>
  startSocketConnection({
    path: `/ws/routes/groups/${groupId}/`,
    parseMessage: parseGroupMessage,
    onStatus,
    onMessage,
  })
