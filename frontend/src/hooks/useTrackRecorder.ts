'use client'

import { useState } from 'react'

import { addTrackFix } from '@/services/trackRecorder'
import type { Coordinates, GeolocationState } from '@/types/geolocation'

/**
 * The track the rider has covered so far, built from the GPS fixes (each new `timestamp` counts
 * once) with poor and repeated fixes left out.
 */
export const useTrackRecorder = ({
  coordinates,
  timestamp,
  accuracy,
}: GeolocationState): readonly Coordinates[] => {
  const [track, setTrack] = useState<readonly Coordinates[]>([])
  const [recordedFixTime, setRecordedFixTime] = useState<number | null>(null)

  if (coordinates && timestamp !== null && timestamp !== recordedFixTime) {
    setRecordedFixTime(timestamp)
    setTrack(addTrackFix(track, coordinates, accuracy))
  }

  return track
}
