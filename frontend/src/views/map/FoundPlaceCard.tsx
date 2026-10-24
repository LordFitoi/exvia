'use client'

import PlaceCard from '@/views/map/PlaceCard'
import { formatCoordinates } from '@/services/formatCoordinates'
import type { Place } from '@/types/place'
import type { SavePlaceRequest } from '@/types/placeLocation'

// The search joins a place's name and its address with this separator.
const NAME_ADDRESS_SEPARATOR = ', '

interface FoundPlaceCardProps {
  place: Place
  /** The rider wants to ride to the place. */
  onRide: (place: Place) => void
  /** The rider wants to save the place. */
  onSave: (request: SavePlaceRequest) => void
  onClose: () => void
}

/** The card of a place picked in the search: its name, its address and where it is, and what to do there. */
export default function FoundPlaceCard({ place, onRide, onSave, onClose }: FoundPlaceCardProps) {
  const [title, ...addressParts] = place.name.split(NAME_ADDRESS_SEPARATOR)
  const address = addressParts.join(NAME_ADDRESS_SEPARATOR)

  return (
    <PlaceCard
      title={title}
      subtitle={
        <>
          {address && `${address} · `}
          <span className="data">{formatCoordinates(place.coordinates)}</span>
        </>
      }
      iconClass="icon-pin"
      onClose={onClose}
    >
      <div className="button-row">
        <button
          className="button button-soft button-square"
          type="button"
          aria-label="Save place"
          onClick={() => onSave({ coordinates: place.coordinates, suggestedName: title })}
        >
          <span className="icon icon-star" aria-hidden="true"></span>
        </button>
        <button className="button button-primary" type="button" onClick={() => onRide(place)}>
          <span className="icon icon-flag-checkered" aria-hidden="true"></span>
          Ride here
        </button>
      </div>
    </PlaceCard>
  )
}
