'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { useMyRoutes } from '@/hooks/useMyRoutes'
import { useRouteDetail } from '@/hooks/useRouteDetail'
import FreeRideView from '@/views/ride/FreeRideView'
import RideModeView from '@/views/ride/RideModeView'
import RoutePickerView from '@/views/ride/RoutePickerView'

const HOME_PATH = '/'
const MAP_PATH = '/map'

type RideStage = 'picker' | 'route' | 'free'

export default function RideOverview() {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [stage, setStage] = useState<RideStage>('picker')
  const myRoutes = useMyRoutes()
  const detail = useRouteDetail(selectedId)

  // Back to wherever the rider came from, or Home when the app was opened on this screen.
  const handleClose = () => {
    if (window.history.length > 1) router.back()
    else router.replace(HOME_PATH)
  }

  // Replacing /ride with the map keeps Back from returning to a ride that is over.
  const handleFinish = () => router.replace(MAP_PATH)
  const handleBackToPicker = () => setStage('picker')

  if (stage === 'free') return <FreeRideView onLeave={handleBackToPicker} onSaved={handleFinish} />
  if (stage === 'route' && detail.route) {
    return <RideModeView route={detail.route} onQuit={handleBackToPicker} onFinish={handleFinish} />
  }
  return (
    <RoutePickerView
      myRoutes={myRoutes}
      detail={detail}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onRide={() => setStage('route')}
      onFreeRide={() => setStage('free')}
      onClose={handleClose}
    />
  )
}
