'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { startGroupConnection } from '@/services/groupConnection'
import type { ConnectionStatus } from '@/services/groupConnection'
import type { GroupMessage, LivePosition, PresenceStatus } from '@/services/groupMessages'

export type PresenceHandler = (userId: number, status: PresenceStatus) => void

interface GroupChannel {
  readonly status: ConnectionStatus
  /** The latest position of every other rider, by user id. */
  readonly positions: ReadonlyMap<number, LivePosition>
  send: (message: object) => void
}

/** The saved positions, aged by the server's clock so a phone with a wrong clock does not misjudge them. */
const toSnapshot = (message: Extract<GroupMessage, { type: 'ready' }>): Map<number, LivePosition> => {
  const clockSkew = Date.now() - message.serverTime
  const others = message.positions.filter(({ userId }) => userId !== message.userId)
  return new Map(others.map((position) => [position.userId, { position, seenAt: position.recordedAt + clockSkew }]))
}

/** Joins the live channel of a group for as long as the screen is mounted; `onPresence` hears the other riders come and go. */
export const useGroupChannel = (groupId: string, onPresence: PresenceHandler): GroupChannel => {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [positions, setPositions] = useState<ReadonlyMap<number, LivePosition>>(new Map())
  const sendRef = useRef<(message: object) => void>(() => undefined)
  const onPresenceRef = useRef(onPresence)

  useEffect(() => {
    onPresenceRef.current = onPresence
  }, [onPresence])

  useEffect(() => {
    const handleMessage = (message: GroupMessage) => {
      if (message.type === 'ready') setPositions(toSnapshot(message))
      if (message.type === 'error') console.error(`The ride channel refused a message: ${message.detail}`)
      if (message.type === 'presence') onPresenceRef.current(message.userId, message.status)
      if (message.type !== 'position') return
      const live = { position: message.position, seenAt: Date.now() }
      setPositions((previous) => new Map(previous).set(message.position.userId, live))
    }
    const connection = startGroupConnection({ groupId, onStatus: setStatus, onMessage: handleMessage })
    sendRef.current = connection.send
    return () => {
      connection.stop()
      sendRef.current = () => undefined
    }
  }, [groupId])

  const send = useCallback((message: object) => sendRef.current(message), [])

  return { status, positions, send }
}
