'use client'

import { useCallback, useState } from 'react'

import { useRiderSuggestions } from '@/hooks/useRiderSuggestions'
import { NO_ACTIVE_OPTION, stepActiveOption } from '@/services/suggestionCursor'
import type { RiderProfile } from '@/types/routeGroup'

export interface UsernameCompletion {
  readonly value: string
  readonly suggestions: readonly RiderProfile[]
  /** Whether the list is showing: it is open and has riders to offer. */
  readonly isVisible: boolean
  /** The rider that the arrow keys are on, who Enter picks. */
  readonly activeRider: RiderProfile | undefined
  /** The text typed: opens the list again for the new text. */
  change: (text: string) => void
  /** Fills the field in with this rider and closes the list. */
  pick: (rider: RiderProfile) => void
  /** Moves the active rider down (1) or up (-1) the list. */
  move: (step: number) => void
  close: () => void
}

/** The state of a username field that completes the name: what is typed, who is offered and who is active. */
export const useUsernameCompletion = (excludedUsernames: readonly string[]): UsernameCompletion => {
  const [value, setValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(NO_ACTIVE_OPTION)
  const riders = useRiderSuggestions(value)
  const suggestions = riders.filter(({ username }) => !excludedUsernames.includes(username))
  const isVisible = isOpen && suggestions.length > 0
  const close = useCallback(() => setIsOpen(false), [])

  const change = (text: string) => {
    setValue(text)
    setActiveIndex(NO_ACTIVE_OPTION)
    setIsOpen(true)
  }
  const pick = (rider: RiderProfile) => {
    setValue(rider.username)
    setActiveIndex(NO_ACTIVE_OPTION)
    setIsOpen(false)
  }
  const move = (step: number) => setActiveIndex(stepActiveOption(activeIndex, step, suggestions.length))

  const activeRider = suggestions[activeIndex]
  return { value, suggestions, isVisible, activeRider, change, pick, move, close }
}
