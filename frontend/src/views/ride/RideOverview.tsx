'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { useMyRoutes } from '@/hooks/useMyRoutes'
import { useRouteDetail } from '@/hooks/useRouteDetail'
import RideModeView from '@/views/ride/RideModeView'
import RoutePickerView from '@/views/ride/RoutePickerView'

const HOME_PATH = '/'
const MAP_PATH = '/map'

export default function RideOverview() {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isRiding, setIsRiding] = useState(false)
  const myRoutes = useMyRoutes()
  const detail = useRouteDetail(selectedId)

  // Back to wherever the rider came from, or Home when the app was opened on this screen.
  const handleClose = () => {
    if (window.history.length > 1) router.back()
    else router.replace(HOME_PATH)
  }

  // Replacing /ride with the map keeps Back from returning to a ride that is over.
  if (isRiding && detail.route) {
    return (
      <RideModeView
        route={detail.route}
        onQuit={() => setIsRiding(false)}
        onFinish={() => router.replace(MAP_PATH)}
      />
    )
  }
  return (
    <RoutePickerView
      myRoutes={myRoutes}
      detail={detail}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onRide={() => setIsRiding(true)}
      onClose={handleClose}
    />
  )
}
