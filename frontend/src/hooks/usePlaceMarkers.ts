'use client'

import { useEffect, useRef } from 'react'
import type { Marker } from 'mapbox-gl'

import { toLngLat } from '@/services/baseMap'
import type { BaseMap } from '@/services/baseMap'
import { createPlaceLocationElement } from '@/services/placeLocationMarkers'
import type { PlaceLocation } from '@/types/placeLocation'

interface PlaceMarker {
  readonly marker: Marker
  /** What the marker shows and hands over when tapped: it is made again when this changes. */
  readonly content: string
}

const describeContent = ({ name, notes, category }: PlaceLocation): string => `${category}|${name}|${notes}`

/** One marker per saved place, with its kind's icon, selectable when `onSelect` is given. A place that stays in the list as it is keeps its marker, so panning does not flicker. */
export const usePlaceMarkers = (
  mounted: BaseMap | null,
  places: readonly PlaceLocation[],
  onSelect: ((place: PlaceLocation) => void) | null,
): void => {
  const markersRef = useRef(new Map<number, PlaceMarker>())
  const onSelectRef = useRef(onSelect)
  const isSelectable = onSelect !== null

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    if (!mounted) return
    const markers = markersRef.current
    const currentContents = new Map(places.map((place) => [place.id, describeContent(place)]))
    markers.forEach(({ marker, content }, id) => {
      if (currentContents.get(id) === content) return
      marker.remove()
      markers.delete(id)
    })
    places
      .filter((place) => !markers.has(place.id))
      .forEach((place) => {
        const element = createPlaceLocationElement(
          place,
          isSelectable ? (selected) => onSelectRef.current?.(selected) : null,
        )
        // Markers are centered by their own CSS (translate -50%), so anchor at the corner.
        const marker = new mounted.mapboxgl.Marker({ element, anchor: 'top-left' })
          .setLngLat(toLngLat(place.coordinates))
          .addTo(mounted.map)
        markers.set(place.id, { marker, content: describeContent(place) })
      })
  }, [mounted, places, isSelectable])

  useEffect(() => {
    const markers = markersRef.current
    return () => {
      markers.forEach(({ marker }) => marker.remove())
      markers.clear()
    }
  }, [mounted])
}
