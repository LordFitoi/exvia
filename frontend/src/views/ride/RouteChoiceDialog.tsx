'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

import FormSheet from '@/components/form/FormSheet'
import type { useMyRoutes } from '@/hooks/useMyRoutes'
import type { RideSelection } from '@/types/rideSelection'
import RideChoiceList from '@/views/ride/RideChoiceList'

interface RouteChoiceDialogProps {
  myRoutes: ReturnType<typeof useMyRoutes>
  /** What is selected now; the dialog starts from it and only changes it on Save. */
  selection: RideSelection | null
  onSave: (selection: RideSelection) => void
  onClose: () => void
}

/** A modal sheet to pick the route to ride, or free mode. Closing it leaves the choice as it was. */
export default function RouteChoiceDialog({ myRoutes, selection, onSave, onClose }: RouteChoiceDialogProps) {
  const [pendingSelection, setPendingSelection] = useState(selection)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pendingSelection) onSave(pendingSelection)
    else onClose()
  }

  return (
    <FormSheet
      title="Choose a route"
      submitLabel="Save"
      isPending={false}
      formError={null}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <RideChoiceList
        selection={pendingSelection}
        status={myRoutes.status}
        routes={myRoutes.routes}
        onSelect={setPendingSelection}
        onRetry={myRoutes.reload}
      />
    </FormSheet>
  )
}
