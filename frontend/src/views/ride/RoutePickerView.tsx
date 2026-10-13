'use client'

import { useHideTabBar } from '@/hooks/useHideTabBar'
import RouteChoiceList from '@/views/ride/RouteChoiceList'
import RoutePreview from '@/views/ride/RoutePreview'
import type { useMyRoutes } from '@/hooks/useMyRoutes'
import type { useRouteDetail } from '@/hooks/useRouteDetail'

interface RoutePickerViewProps {
  myRoutes: ReturnType<typeof useMyRoutes>
  detail: ReturnType<typeof useRouteDetail>
  selectedId: number | null
  onSelect: (id: number) => void
  onRide: () => void
  onClose: () => void
}

export default function RoutePickerView({
  myRoutes,
  detail,
  selectedId,
  onSelect,
  onRide,
  onClose,
}: RoutePickerViewProps) {
  // A full-height screen with its own close button, so the tab bar steps aside.
  useHideTabBar(true)

  return (
    <main className="screen-body route-picker">
      <div className="screen-header">
        <h1 className="text-heading">Ride</h1>
        <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>
          <span className="icon icon-x" aria-hidden="true"></span>
        </button>
      </div>
      <div className="route-picker-body">
        <RoutePreview status={detail.status} route={detail.shownRoute} onRetry={detail.retry} />
        <RouteChoiceList
          status={myRoutes.status}
          routes={myRoutes.routes}
          selectedId={selectedId}
          onSelect={onSelect}
          onRetry={myRoutes.reload}
        />
      </div>
      <button
        className="button button-primary button-lg button-block"
        type="button"
        disabled={!detail.route}
        onClick={onRide}
      >
        <span className="icon icon-flag-checkered" aria-hidden="true"></span>
        Ride
      </button>
    </main>
  )
}
