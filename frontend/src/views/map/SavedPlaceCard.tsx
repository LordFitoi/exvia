'use client'

import { useState } from 'react'

import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import EditPlaceSheet from '@/views/map/EditPlaceSheet'
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
  /** The rider edited the place; `place` is the saved version. */
  onUpdated: (place: PlaceLocation) => void
  onClose: () => void
}

/** The card of one of the rider's saved places: its kind, its notes, and the way to edit it, ride there or delete it. */
export default function SavedPlaceCard({ place, onRide, onDeleted, onUpdated, onClose }: SavedPlaceCardProps) {
  const { label, iconClass } = describePlaceLocationCategory(place.category)
  const deletion = usePlaceDeletion({ placeId: place.id, onDeleted: () => onDeleted(place) })
  const [isEditing, setIsEditing] = useState(false)

  const handleUpdated = (updated: PlaceLocation) => {
    setIsEditing(false)
    onUpdated(updated)
  }

  return (
    <PlaceCard
      title={place.name}
      subtitle={
        <>
          {label} · <span className="data">{formatCoordinates(place.coordinates)}</span>
        </>
      }
      iconClass={iconClass}
      headerActions={
        <button className="icon-button" type="button" aria-label="Edit place" onClick={() => setIsEditing(true)}>
          <span className="icon icon-edit" aria-hidden="true"></span>
        </button>
      }
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
      {isEditing && <EditPlaceSheet place={place} onUpdated={handleUpdated} onClose={() => setIsEditing(false)} />}
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
