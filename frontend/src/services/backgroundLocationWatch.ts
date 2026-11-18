import { registerPlugin } from '@capacitor/core'
import type {
  BackgroundGeolocationPlugin,
  CallbackError,
  Location,
} from '@capacitor-community/background-geolocation'

const NOTIFICATION_TITLE = 'Exvia'
const NOTIFICATION_MESSAGE = 'Sharing your location with your ride'
const NOT_AUTHORIZED_CODE = 'NOT_AUTHORIZED'

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation')

/** Local plugin of the app (CpuWakeLockPlugin.java): keeps the CPU awake while the screen is off. */
interface CpuWakeLockPlugin {
  acquire: () => Promise<void>
  release: () => Promise<void>
}
const CpuWakeLock = registerPlugin<CpuWakeLockPlugin>('CpuWakeLock')

const holdWakeLock = async (action: 'acquire' | 'release') => {
  try {
    await CpuWakeLock[action]()
  } catch (error) {
    console.error(`Could not ${action} the wake lock of the background location watch`, error)
  }
}

interface BackgroundWatchHandlers {
  onLocation: (location: Location) => void
  /** `isDenied` is true when the rider refused the permission or turned the phone's location off. */
  onFailure: (isDenied: boolean) => void
}

/**
 * Follows the position through the native app's foreground service, which keeps delivering it while the
 * screen is locked or another app is in front. Android shows an ongoing notification for as long as the
 * watch lasts, and ends the service on its own when the app is closed. Returns the function that stops it.
 */
export const startBackgroundWatch = ({ onLocation, onFailure }: BackgroundWatchHandlers): (() => void) => {
  let isStopped = false
  let watcherId: string | null = null

  const removeWatcher = async (id: string) => {
    try {
      await BackgroundGeolocation.removeWatcher({ id })
    } catch (error) {
      console.error('Could not stop the background location watch', error)
    }
  }

  const handleUpdate = (location?: Location, error?: CallbackError) => {
    if (error) return onFailure(error.code === NOT_AUTHORIZED_CODE)
    if (location) onLocation(location)
  }

  const start = async () => {
    try {
      const id = await BackgroundGeolocation.addWatcher(
        { backgroundTitle: NOTIFICATION_TITLE, backgroundMessage: NOTIFICATION_MESSAGE },
        handleUpdate,
      )
      if (isStopped) removeWatcher(id)
      else watcherId = id
    } catch (error) {
      console.error('Could not start the background location watch', error)
      onFailure(false)
    }
  }

  holdWakeLock('acquire')
  start()
  return () => {
    isStopped = true
    holdWakeLock('release')
    if (watcherId !== null) removeWatcher(watcherId)
  }
}
