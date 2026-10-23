import PlaceCard from '@/views/map/PlaceCard'
import { formatCoordinates } from '@/services/formatCoordinates'
import { describePlaceLocationCategory } from '@/services/placeLocationCategories'
import type { Place } from '@/types/place'
import type { PlaceLocation } from '@/types/placeLocation'

interface SavedPlaceCardProps {
  place: PlaceLocation
  /** The rider wants to ride to the place. */
  onRide: (place: Place) => void
  onClose: () => void
}

/** The card of one of the rider's saved places: its kind, its notes, and the way to ride there. */
export default function SavedPlaceCard({ place, onRide, onClose }: SavedPlaceCardProps) {
  const { label, iconClass } = describePlaceLocationCategory(place.category)

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
      <button
        className="button button-primary button-block"
        type="button"
        onClick={() => onRide({ id: `place-location-${place.id}`, name: place.name, coordinates: place.coordinates })}
      >
        <span className="icon icon-flag-checkered" aria-hidden="true"></span>
        Ride here
      </button>
    </PlaceCard>
  )
}
