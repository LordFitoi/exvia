'use client'

import PlaceFormSheet from '@/views/map/PlaceFormSheet'
import { updatePlaceLocation } from '@/services/placeLocationsApi'
import type { PlaceDetails, PlaceLocation } from '@/types/placeLocation'

interface EditPlaceSheetProps {
  place: PlaceLocation
  onUpdated: (place: PlaceLocation) => void
  onClose: () => void
}

/** The sheet that changes the name, the kind and the notes of a saved place. Its spot stays where it is. */
export default function EditPlaceSheet({ place, onUpdated, onClose }: EditPlaceSheetProps) {
  const handleSubmit = async (details: PlaceDetails) => {
    onUpdated(await updatePlaceLocation(place.id, details))
  }

  return (
    <PlaceFormSheet
      title="Edit place"
      submitLabel="Save changes"
      initial={place}
      onSubmit={handleSubmit}
      onClose={onClose}
    />
  )
}
