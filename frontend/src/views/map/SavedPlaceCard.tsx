'use client'

import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import PlaceCard from '@/views/map/PlaceCard'
import { usePlaceDeletion } from '@/hooks/usePlaceDeletion'
import { formatCoordinates } from '@/services/formatCoordinates'
import { describePlaceLocationCategory } from '@/services/placeLocationCategories'
import type { Place } from '@/types/place'
import type { PlaceLocation } from '@/types/placeLocation'

interface SavedPlaceCardProps {
  place: PlaceLocation
  /** The rider wants to ride to the place. */
  onRide: (place: Place) => void
  /** The rider deleted the place, after confirming. */
  onDeleted: (place: PlaceLocation) => void
  onClose: () => void
}

/** The card of one of the rider's saved places: its kind, its notes, and the way to ride there or delete it. */
export default function SavedPlaceCard({ place, onRide, onDeleted, onClose }: SavedPlaceCardProps) {
  const { label, iconClass } = describePlaceLocationCategory(place.category)
  const deletion = usePlaceDeletion({ placeId: place.id, onDeleted: () => onDeleted(place) })

  return (
    <PlaceCard
      title={place.name}
      subtitle={
        <>
          {label} · <span className="data">{formatCoordinates(place.coordinates)}</span>
        </>
      }
      iconClass={iconClass}
      onClose={onClose}
    >
      {place.notes && <p className="place-card-notes">{place.notes}</p>}
      <div className="button-row">
        <button
          className="button button-soft button-error button-square"
          type="button"
          aria-label="Delete place"
          onClick={deletion.requestDeletion}
        >
          <span className="icon icon-trash" aria-hidden="true"></span>
        </button>
        <button
          className="button button-primary"
          type="button"
          onClick={() => onRide({ id: `place-location-${place.id}`, name: place.name, coordinates: place.coordinates })}
        >
          <span className="icon icon-flag-checkered" aria-hidden="true"></span>
          Ride here
        </button>
      </div>
      <ConfirmDialog
        isOpen={deletion.isConfirming}
        title="Delete this place?"
        description={`“${place.name}” will be removed from your saved places. This cannot be undone.`}
        isPending={deletion.isPending}
        error={deletion.error}
        onCancel={deletion.cancel}
        onConfirm={deletion.confirm}
      />
    </PlaceCard>
  )
}
