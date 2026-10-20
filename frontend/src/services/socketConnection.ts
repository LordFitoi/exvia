import { getAccessToken } from '@/services/authorizedRequest'
export type ConnectionStatus = 'connecting' | 'open' | 'denied'

const CLOSE_UNAUTHORIZED = 4401
const CLOSE_FORBIDDEN = 4403
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000] as const

interface ConnectionOptions<Message extends { readonly type: string }> {
  /** The websocket path, such as `/ws/notifications/`. */
  path: string
  /** Reads one raw frame; null for anything the client does not know. */
  parseMessage: (raw: unknown) => Message | null
  onStatus: (status: ConnectionStatus) => void
  onMessage: (message: Message) => void
}

interface SocketConnection {
  /** Sends a JSON message once the server has accepted the sign-in; before that, or after a drop, it is dropped. */
  send: (message: object) => void
  /** Closes the channel for good and stops reconnecting. */
  stop: () => void
}

const buildUrl = (path: string): string => {
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${scheme}://${window.location.host}${path}`
}

/**
 * Opens a live channel, signs in with the access token as its first message, and reconnects with a
 * growing delay when it drops. The server says it accepted the sign-in with a `ready` message. A
 * rejected token is renewed once; a rider who is not allowed in (4403), or whose renewed token is
 * rejected too, is not retried.
 */
export const startSocketConnection = <Message extends { readonly type: string }>({
  path,
  parseMessage,
  onStatus,
  onMessage,
}: ConnectionOptions<Message>): SocketConnection => {
  let socket: WebSocket | null = null
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let isStopped = false
  let isReady = false
  let failures = 0
  let isRenewalNeeded = false
  let hasRenewed = false

  const scheduleRetry = () => {
    onStatus('connecting')
    retryTimer = setTimeout(() => {
      retryTimer = undefined
      connect()
    }, RETRY_DELAYS_MS[Math.min(failures, RETRY_DELAYS_MS.length - 1)])
    failures += 1
  }

  // A phone that was locked or in another app drops the socket and may have slept through the backoff,
  // so coming back (or getting the network back) retries at once instead of waiting for the timer.
  const retryNow = () => {
    if (retryTimer === undefined) return
    clearTimeout(retryTimer)
    retryTimer = undefined
    failures = 0
    connect()
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') retryNow()
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

  const handleMessage = (message: Message) => {
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
      console.error('Could not sign in to the live channel', error)
      if (!isStopped) onStatus('denied')
      return
    }
    if (isStopped) return
    isRenewalNeeded = false
    const opened = new WebSocket(buildUrl(path))
    opened.onopen = () => opened.send(JSON.stringify({ type: 'auth', token }))
    opened.onmessage = (event) => {
      const message = parseMessage(event.data)
      if (message) handleMessage(message)
    }
    opened.onclose = (event) => handleClose(event.code)
    socket = opened
  }

  connect()
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('online', retryNow)

  return {
    send: (message) => {
      if (isReady) socket?.send(JSON.stringify(message))
    },
    stop: () => {
      isStopped = true
      clearTimeout(retryTimer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', retryNow)
      socket?.close()
    },
  }
}
