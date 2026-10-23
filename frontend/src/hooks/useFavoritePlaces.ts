'use client'

import { useEffect, useState } from 'react'

import { fetchAllPlaceLocations } from '@/services/placeLocationsApi'
import type { PlaceLocation } from '@/types/placeLocation'

const NO_PLACES: readonly PlaceLocation[] = []

/**
 * The rider's saved places, loaded each time `isOpen` turns true (the search field gets focus) so one
 * saved a moment ago is there, and matched in the browser as the text is typed. A failure is only logged:
 * the search still answers with the places of the services.
 */
export const useFavoritePlaces = (isOpen: boolean): readonly PlaceLocation[] => {
  const [places, setPlaces] = useState<readonly PlaceLocation[]>(NO_PLACES)

  useEffect(() => {
    if (!isOpen) return
    const controller = new AbortController()
    const load = async () => {
      try {
        setPlaces(await fetchAllPlaceLocations(controller.signal))
      } catch (error) {
        if (!controller.signal.aborted) console.error('Could not load the saved places to search', error)
      }
    }
    load()
    return () => controller.abort()
  }, [isOpen])

  return places
}
