'use client'

import PlaceCard from '@/views/map/PlaceCard'
import { useNearestCommerce } from '@/hooks/useNearestCommerce'
import type { NearestCommerceState } from '@/hooks/useNearestCommerce'
import { formatMeters } from '@/services/formatRoute'
import { formatCoordinates } from '@/services/formatCoordinates'
import { buildCoordinateResult } from '@/services/placeParsing'
import type { Coordinates } from '@/types/geolocation'
import type { Place } from '@/types/place'
import type { SavePlaceRequest } from '@/types/placeLocation'

// A business this close is the place itself, so its name is a good start for the saved place's name.
const NAME_SUGGESTION_MAX_METERS = 50
const COMMERCE_MESSAGES = {
  loading: 'Looking for the nearest business…',
  none: 'No business within 500 m.',
  failed: "Couldn't look up nearby businesses.",
} as const

interface PinPlaceCardProps {
  coordinates: Coordinates
  /** The rider wants to ride to the spot. */
  onRide: (place: Place) => void
  /** The rider wants to save the spot. */
  onSave: (request: SavePlaceRequest) => void
  onClose: () => void
}

const describeCommerce = (state: NearestCommerceState): string => {
  if (state.status !== 'found') return COMMERCE_MESSAGES[state.status]
  const { title, distanceMeters } = state.commerce
  return `Near ${title} · ${formatMeters(distanceMeters)} away`
}

const suggestName = (state: NearestCommerceState): string =>
  state.status === 'found' && state.commerce.distanceMeters <= NAME_SUGGESTION_MAX_METERS ? state.commerce.title : ''

/** The card of a spot pressed and held on the map: where it is, the nearest business, and what to do there. Mount it with a `key` per spot. */
export default function PinPlaceCard({ coordinates, onRide, onSave, onClose }: PinPlaceCardProps) {
  const commerce = useNearestCommerce(coordinates)
  // The same "Dropped pin" a pasted coordinate gives, so a ride to it reads the same everywhere.
  const place = buildCoordinateResult(coordinates, coordinates).place

  return (
    <PlaceCard
      title="Dropped pin"
      subtitle={<span className="data">{formatCoordinates(coordinates)}</span>}
      iconClass="icon-pin"
      onClose={onClose}
    >
      <p className="text-body2" role="status">
        {describeCommerce(commerce)}
      </p>
      <div className="button-row button-row-even">
        <button
          className="button button-soft"
          type="button"
          onClick={() => onSave({ coordinates, suggestedName: suggestName(commerce) })}
        >
          <span className="icon icon-star" aria-hidden="true"></span>
          Save place
        </button>
        <button className="button button-primary" type="button" onClick={() => onRide(place)}>
          <span className="icon icon-flag-checkered" aria-hidden="true"></span>
          Ride here
        </button>
      </div>
    </PlaceCard>
  )
}
