'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { startGroupConnection } from '@/services/groupConnection'
import type { ConnectionStatus } from '@/services/groupConnection'
import type { GroupMessage, LivePosition, PositionBatch, PresenceStatus } from '@/services/groupMessages'

export type PresenceHandler = (userId: number, status: PresenceStatus) => void

export interface GroupChannelHandlers {
  /** Hears the channel sign in, the first time and after every drop: what was missed meanwhile is read again. */
  readonly onReady: () => void
  /** Hears the other riders come and go. */
  readonly onPresence: PresenceHandler
  /** Hears the leader change the route. */
  readonly onRouteChange: () => void
  /** Hears the leader hand the group to another rider, who is named by id. */
  readonly onLeaderChange: (leaderId: number) => void
}

interface GroupChannel {
  readonly status: ConnectionStatus
  /** The latest position of every other rider, by user id; all the riders that moved arrive in one update. */
  readonly positions: ReadonlyMap<number, LivePosition>
  send: (message: object) => void
}

/** The positions of a message, aged by the server's clock so a phone with a wrong clock does not misjudge them. */
const toLivePositions = ({ serverTime, positions }: PositionBatch): [number, LivePosition][] => {
  const clockSkew = Date.now() - serverTime
  return positions.map((position) => [position.userId, { position, seenAt: position.recordedAt + clockSkew }])
}

/** Joins the live channel of a group for as long as the screen is mounted. */
export const useGroupChannel = (groupId: string, handlers: GroupChannelHandlers): GroupChannel => {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [positions, setPositions] = useState<ReadonlyMap<number, LivePosition>>(new Map())
  const sendRef = useRef<(message: object) => void>(() => undefined)
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    const handleMessage = (message: GroupMessage) => {
      if (message.type === 'ready') {
        const others = toLivePositions(message).filter(([userId]) => userId !== message.userId)
        setPositions(new Map(others))
        handlersRef.current.onReady()
      }
      if (message.type === 'positions') {
        const changed = toLivePositions(message)
        setPositions((previous) => new Map([...previous, ...changed]))
      }
      if (message.type === 'error') console.error(`The ride channel refused a message: ${message.detail}`)
      if (message.type === 'presence') handlersRef.current.onPresence(message.userId, message.status)
      if (message.type === 'route_changed') handlersRef.current.onRouteChange()
      if (message.type === 'leader_changed') handlersRef.current.onLeaderChange(message.userId)
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
