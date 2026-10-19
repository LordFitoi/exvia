import { getAccessToken } from '@/services/authorizedRequest'
import { parseGroupMessage } from '@/services/groupMessages'
import type { GroupMessage } from '@/services/groupMessages'

export type ConnectionStatus = 'connecting' | 'open' | 'denied'

const CLOSE_UNAUTHORIZED = 4401
const CLOSE_FORBIDDEN = 4403
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000] as const

interface ConnectionOptions {
  groupId: string
  onStatus: (status: ConnectionStatus) => void
  onMessage: (message: GroupMessage) => void
}

interface GroupConnection {
  /** Sends a JSON message once the server has accepted the sign-in; before that, or after a drop, it is dropped. */
  send: (message: object) => void
  /** Closes the channel for good and stops reconnecting. */
  stop: () => void
}

const buildUrl = (groupId: string): string => {
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${scheme}://${window.location.host}/ws/routes/groups/${groupId}/`
}

/**
 * Opens the live channel of a group, signs in with the access token as its first message, and
 * reconnects with a growing delay when it drops. A rejected token is renewed once; a rider who is not
 * in the group (4403), or whose renewed token is rejected too, is not retried.
 */
export const startGroupConnection = ({ groupId, onStatus, onMessage }: ConnectionOptions): GroupConnection => {
  let socket: WebSocket | null = null
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let isStopped = false
  let isReady = false
  let failures = 0
  let isRenewalNeeded = false
  let hasRenewed = false

  const scheduleRetry = () => {
    onStatus('connecting')
    retryTimer = setTimeout(connect, RETRY_DELAYS_MS[Math.min(failures, RETRY_DELAYS_MS.length - 1)])
    failures += 1
  }

  const handleClose = (code: number) => {
    socket = null
    isReady = false
    if (isStopped) return
    if (code === CLOSE_FORBIDDEN) return onStatus('denied')
    if (code === CLOSE_UNAUTHORIZED) {
      if (hasRenewed) return onStatus('denied')
      hasRenewed = true
      isRenewalNeeded = true
    }
    scheduleRetry()
  }

  const handleMessage = (message: GroupMessage) => {
    if (message.type === 'ready') {
      isReady = true
      failures = 0
      hasRenewed = false
      onStatus('open')
    }
    onMessage(message)
  }

  const connect = async (): Promise<void> => {
    let token: string
    try {
      token = await getAccessToken(isRenewalNeeded)
    } catch (error) {
      console.error('Could not sign in to the ride channel', error)
      if (!isStopped) onStatus('denied')
      return
    }
    if (isStopped) return
    isRenewalNeeded = false
    const opened = new WebSocket(buildUrl(groupId))
    opened.onopen = () => opened.send(JSON.stringify({ type: 'auth', token }))
    opened.onmessage = (event) => {
      const message = parseGroupMessage(event.data)
      if (message) handleMessage(message)
    }
    opened.onclose = (event) => handleClose(event.code)
    socket = opened
  }

  connect()

  return {
    send: (message) => {
      if (isReady) socket?.send(JSON.stringify(message))
    },
    stop: () => {
      isStopped = true
      clearTimeout(retryTimer)
      socket?.close()
    },
  }
}
