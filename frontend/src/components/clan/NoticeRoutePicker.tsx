'use client'

import RouteChoiceList from '@/components/route/RouteChoiceList'
import { useMyRoutes } from '@/hooks/useMyRoutes'

interface NoticeRoutePickerProps {
  selectedId: string | null
  onSelect: (id: string | null) => void
}

/** The caller's routes to attach one to a notice; tapping the chosen route again takes it off. */
export default function NoticeRoutePicker({ selectedId, onSelect }: NoticeRoutePickerProps) {
  const myRoutes = useMyRoutes()

  const handleSelect = (id: string) => onSelect(id === selectedId ? null : id)

  return (
    <div className="field">
      <span className="field-label">Route (optional)</span>
      <RouteChoiceList
        size="rows"
        status={myRoutes.status}
        routes={myRoutes.routes}
        selectedId={selectedId}
        onSelect={handleSelect}
        onRetry={myRoutes.reload}
        emptyAction={null}
      />
      <p className="field-hint">Members can open it from the notice. Tap the chosen route again to remove it.</p>
    </div>
  )
}
