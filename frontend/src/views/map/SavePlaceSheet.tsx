'use client'

import PlaceFormSheet from '@/views/map/PlaceFormSheet'
import { DEFAULT_PLACE_LOCATION_CATEGORY } from '@/services/placeLocationCategories'
import { createPlaceLocation } from '@/services/placeLocationsApi'
import type { PlaceDetails, PlaceLocation, SavePlaceRequest } from '@/types/placeLocation'

interface SavePlaceSheetProps {
  request: SavePlaceRequest
  onSaved: (place: PlaceLocation) => void
  onClose: () => void
}

/** The sheet that names a spot, picks its kind and takes personal notes, then saves it as a favorite place. */
export default function SavePlaceSheet({ request, onSaved, onClose }: SavePlaceSheetProps) {
  const initial: PlaceDetails = { name: request.suggestedName, notes: '', category: DEFAULT_PLACE_LOCATION_CATEGORY }

  const handleSubmit = async (details: PlaceDetails) => {
    onSaved(await createPlaceLocation({ ...details, coordinates: request.coordinates }))
  }

  return (
    <PlaceFormSheet
      title="Save place"
      submitLabel="Save place"
      initial={initial}
      onSubmit={handleSubmit}
      onClose={onClose}
    />
  )
}
