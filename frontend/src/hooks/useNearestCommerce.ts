'use client'

import { useEffect, useState } from 'react'

import { fetchNearestCommerce } from '@/services/nearestCommerceApi'
import type { Coordinates } from '@/types/geolocation'
import type { PlaceResult } from '@/types/place'

export type NearestCommerceState =
  | { readonly status: 'loading' }
  | { readonly status: 'found'; readonly commerce: PlaceResult }
  | { readonly status: 'none' }
  | { readonly status: 'failed' }

/** The business closest to a spot. Starts as `loading`: mount it with a `key` per spot to ask again for another. */
export const useNearestCommerce = ({ longitude, latitude }: Coordinates): NearestCommerceState => {
  const [state, setState] = useState<NearestCommerceState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      try {
        const commerce = await fetchNearestCommerce({ longitude, latitude }, controller.signal)
        setState(commerce ? { status: 'found', commerce } : { status: 'none' })
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('Could not look up the nearest business', error)
        setState({ status: 'failed' })
      }
    }
    load()
    return () => controller.abort()
  }, [longitude, latitude])

  return state
}
