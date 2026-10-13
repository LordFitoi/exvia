'use client'

import { useEffect } from 'react'

const releaseQuietly = async (lock: WakeLockSentinel): Promise<void> => {
  try {
    await lock.release()
  } catch (error) {
    console.error('Could not release the screen wake lock', error)
  }
}

/**
 * Keeps the screen on while `isActive`. Browsers drop the lock whenever the page is hidden, so it
 * is requested again when the page becomes visible. Does nothing where the Wake Lock API is missing.
 */
export const useWakeLock = (isActive: boolean): void => {
  useEffect(() => {
    if (!isActive || !('wakeLock' in navigator)) return

    let isStopped = false
    let lock: WakeLockSentinel | null = null
    const acquire = async () => {
      if (lock && !lock.released) return
      try {
        const granted = await navigator.wakeLock.request('screen')
        if (isStopped) await releaseQuietly(granted)
        else lock = granted
      } catch (error) {
        // Refused, for example by a low battery; the screen then follows the device's timeout.
        console.error('Could not keep the screen awake', error)
      }
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      isStopped = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (lock) releaseQuietly(lock)
    }
  }, [isActive])
}
