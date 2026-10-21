'use client'

import { useMemo } from 'react'

import { measureLegs, measurePath } from '@/services/routeProgress'
import type { RideRoute } from '@/types/route'

const NO_LEGS: readonly number[] = []

/** The length in kilometres of each leg of the route (see `measureLegs`); empty while there is no route. */
export const useRouteLegs = (route: RideRoute | null): readonly number[] =>
  useMemo(() => (route ? measureLegs(measurePath(route.points), route.waypoints) : NO_LEGS), [route])
