'use client'

import { useState } from 'react'

import FormAlert from '@/components/form/FormAlert'
import RoutePreview from '@/components/route/RoutePreview'
import { useAuth } from '@/hooks/useAuth'
import { useHideTabBar } from '@/hooks/useHideTabBar'
import type { useRideSetup } from '@/hooks/useRideSetup'
import type { useStartGroupRide } from '@/hooks/useStartGroupRide'
import { MAX_INVITEES } from '@/services/groupRules'
import type { NewRouteGroup } from '@/types/routeGroup'
import InvitationsSection from '@/views/ride/InvitationsSection'
import InviteRiderDialog from '@/views/ride/InviteRiderDialog'
import RideRouteSection from '@/views/ride/RideRouteSection'
import RouteChoiceDialog from '@/views/ride/RouteChoiceDialog'

type PickerDialog = 'route' | 'invite' | null

interface RoutePickerViewProps {
  setup: ReturnType<typeof useRideSetup>
  start: ReturnType<typeof useStartGroupRide>
  /** Whether it is being checked that no group is still rolling, before the ride starts. */
  isChecking: boolean
  /** Starts the ride: creates the group of this route and these invitees. */
  onRide: (request: NewRouteGroup) => void
  onClose: () => void
}

export default function RoutePickerView({ setup, start, isChecking, onRide, onClose }: RoutePickerViewProps) {
  // A full-height screen with its own close button, so the tab bar steps aside.
  useHideTabBar(true)
  const { user } = useAuth()
  const [openDialog, setOpenDialog] = useState<PickerDialog>(null)
  const { myRoutes, selection, detail, invitees } = setup
  const isFreeMode = selection?.kind === 'free'
  const canRide = isFreeMode || detail.route !== null
  const isStarting = start.isPending || isChecking

  const handleSave = (chosen: Parameters<typeof setup.select>[0]) => {
    setup.select(chosen)
    setOpenDialog(null)
  }

  const handleAdded = (rider: Parameters<typeof setup.addInvitee>[0]) => {
    setup.addInvitee(rider)
    setOpenDialog(null)
  }

  const handleRideClick = () =>
    onRide({
      routeId: selection?.kind === 'route' ? selection.id : null,
      invitees: invitees.map(({ username }) => username),
    })

  return (
    <main className="screen-body route-screen">
      <div className="screen-header">
        <h1 className="text-heading">Ride</h1>
        <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>
          <span className="icon icon-x" aria-hidden="true"></span>
        </button>
      </div>
      <div className="route-screen-body route-screen-scroll">
        <RoutePreview
          size="compact"
          status={detail.status}
          route={detail.shownRoute}
          isFreeMode={isFreeMode}
          onRetry={detail.retry}
        />
        <RideRouteSection myRoutes={myRoutes} selection={selection} onChange={() => setOpenDialog('route')} />
        <InvitationsSection
          invitees={invitees}
          canAdd={invitees.length < MAX_INVITEES}
          onAdd={() => setOpenDialog('invite')}
          onRemove={setup.removeInvitee}
        />
      </div>
      <div className="stack-sm">
        <FormAlert message={start.error} />
        <button
          className={`button button-primary button-lg button-block${isStarting ? ' button-loading' : ''}`}
          type="button"
          disabled={!canRide || isStarting}
          aria-busy={isStarting}
          onClick={handleRideClick}
        >
          <span className="icon icon-flag-checkered" aria-hidden="true"></span>
          Ride
        </button>
      </div>
      {openDialog === 'route' && (
        <RouteChoiceDialog
          myRoutes={myRoutes}
          selection={selection}
          onSave={handleSave}
          onClose={() => setOpenDialog(null)}
        />
      )}
      {openDialog === 'invite' && user && (
        <InviteRiderDialog
          ownUsername={user.username}
          invitees={invitees}
          onAdded={handleAdded}
          onClose={() => setOpenDialog(null)}
        />
      )}
    </main>
  )
}
