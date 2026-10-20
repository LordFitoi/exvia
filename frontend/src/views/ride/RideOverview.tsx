'use client'

import { useRouter } from 'next/navigation'

import { useActiveGroupPrompt } from '@/hooks/useActiveGroupPrompt'
import { useRideSetup } from '@/hooks/useRideSetup'
import { useStartGroupRide } from '@/hooks/useStartGroupRide'
import ActiveGroupDialog from '@/views/ride/ActiveGroupDialog'
import RoutePickerView from '@/views/ride/RoutePickerView'

const HOME_PATH = '/'
const RIDE_PATH = '/ride'

/**
 * The Ride screen: the setup (route, invitations). The group that Ride creates is ridden at `/ride/<id>`,
 * so that reloading the page reopens the ride instead of dropping back to the setup.
 */
export default function RideOverview() {
  const router = useRouter()
  const setup = useRideSetup()
  const start = useStartGroupRide(({ id }) => router.replace(`${RIDE_PATH}/${id}`))
  const prompt = useActiveGroupPrompt({
    onJoin: ({ id }) => router.push(`${RIDE_PATH}/${id}`),
    onStart: start.start,
  })

  // Back to wherever the rider came from, or Home when the app was opened on this screen.
  const handleClose = () => {
    if (window.history.length > 1) router.back()
    else router.replace(HOME_PATH)
  }

  return (
    <>
      <RoutePickerView
        setup={setup}
        start={start}
        isChecking={prompt.isChecking}
        onRide={prompt.requestRide}
        onClose={handleClose}
      />
      <ActiveGroupDialog
        group={prompt.offeredGroup}
        onJoin={prompt.join}
        onStartAnother={prompt.startAnother}
        onDismiss={prompt.dismiss}
      />
    </>
  )
}
