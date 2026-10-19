'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { useActiveGroupPrompt } from '@/hooks/useActiveGroupPrompt'
import { useRideSetup } from '@/hooks/useRideSetup'
import { useStartGroupRide } from '@/hooks/useStartGroupRide'
import type { RouteGroup } from '@/types/routeGroup'
import ActiveGroupDialog from '@/views/ride/ActiveGroupDialog'
import GroupRideView from '@/views/ride/GroupRideView'
import RoutePickerView from '@/views/ride/RoutePickerView'

const HOME_PATH = '/'
const MAP_PATH = '/map'
const RIDE_PATH = '/ride'

/** The Ride screen: the setup (route, invitations), then the ride of the group that Ride creates. */
export default function RideOverview() {
  const router = useRouter()
  const setup = useRideSetup()
  const [group, setGroup] = useState<RouteGroup | null>(null)
  const start = useStartGroupRide(setGroup)
  const prompt = useActiveGroupPrompt({
    onJoin: ({ id }) => router.push(`${RIDE_PATH}/${id}`),
    onStart: start.start,
  })

  // Back to wherever the rider came from, or Home when the app was opened on this screen.
  const handleClose = () => {
    if (window.history.length > 1) router.back()
    else router.replace(HOME_PATH)
  }

  // Replacing /ride with the map keeps Back from returning to a ride that is over.
  const handleFinish = () => router.replace(MAP_PATH)

  // Leaving a ride goes back to the setup, with the same route and invitations still chosen.
  if (group) return <GroupRideView group={group} onLeave={() => setGroup(null)} onFinish={handleFinish} />
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
