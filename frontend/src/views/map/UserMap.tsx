'use client'

import 'mapbox-gl/dist/mapbox-gl.css'

import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'

import Toast from '@/components/feedback/Toast'
import MapStatusView from '@/views/map/MapStatusView'
import PinPlaceCard from '@/views/map/PinPlaceCard'
import RouteMenu from '@/views/map/RouteMenu'
import SavedPlaceCard from '@/views/map/SavedPlaceCard'
import SavePlaceSheet from '@/views/map/SavePlaceSheet'
import PlaceSearch from '@/views/routes/PlaceSearch'
import { useMapPlaces } from '@/hooks/useMapPlaces'
import { useUserMap } from '@/hooks/useUserMap'
import { formatCoordinates } from '@/services/formatCoordinates'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import type { Coordinates } from '@/types/geolocation'
import type { Place } from '@/types/place'
import type { PlaceLocation, SavePlaceRequest } from '@/types/placeLocation'

interface UserMapProps {
  coordinates: Coordinates
  onCreateRoute: () => void
  onPreviewRoutes: () => void
  onViewHistory: () => void
  /** A place was picked in the search or on the map: the rider wants to ride there. */
  onSelectPlace: (place: Place) => void
  /** Floating notices, rendered at the top of the map. */
  children?: ReactNode
}

export default function UserMap({
  coordinates,
  onCreateRoute,
  onPreviewRoutes,
  onViewHistory,
  onSelectPlace,
  children,
}: UserMapProps) {
  const { containerRef, mounted, hasLoadFailed, recenter } = useUserMap({
    accessToken: MAPBOX_ACCESS_TOKEN,
    coordinates,
  })
  const { selection, addPlace, clearSelection } = useMapPlaces(mounted)
  const [saveRequest, setSaveRequest] = useState<SavePlaceRequest | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  const dismissSavedMessage = useCallback(() => setSavedMessage(null), [])

  const handleSaved = (place: PlaceLocation) => {
    addPlace(place)
    clearSelection()
    setSaveRequest(null)
    setSavedMessage(`${place.name} saved`)
  }

  if (hasLoadFailed) {
    return (
      <MapStatusView
        title="Map unavailable"
        description="The map could not be loaded. Check your connection and try again later."
      />
    )
  }

  return (
    <main className="map">
      <h1 className="visually-hidden">Map</h1>
      <div ref={containerRef} className="map-canvas"></div>
      <div className="map-overlay">
        <PlaceSearch proximity={coordinates} label="Search a place to ride to" onSelect={onSelectPlace} />
        {children}
        {savedMessage && <Toast message={savedMessage} onDismiss={dismissSavedMessage} />}
        <div className="map-controls">
          <button className="icon-button" type="button" aria-label="Center on my location" onClick={recenter}>
            <span className="icon icon-locate" aria-hidden="true"></span>
          </button>
          <RouteMenu onCreate={onCreateRoute} onPreview={onPreviewRoutes} onHistory={onViewHistory} />
        </div>
      </div>
      {selection?.kind === 'pin' && (
        <PinPlaceCard
          key={formatCoordinates(selection.coordinates)}
          coordinates={selection.coordinates}
          onRide={onSelectPlace}
          onSave={setSaveRequest}
          onClose={clearSelection}
        />
      )}
      {selection?.kind === 'saved' && (
        <SavedPlaceCard
          key={selection.place.id}
          place={selection.place}
          onRide={onSelectPlace}
          onClose={clearSelection}
        />
      )}
      {saveRequest && <SavePlaceSheet request={saveRequest} onSaved={handleSaved} onClose={() => setSaveRequest(null)} />}
    </main>
  )
}
