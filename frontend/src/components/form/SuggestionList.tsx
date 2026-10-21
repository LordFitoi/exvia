import type { RefObject } from 'react'

import RiderAvatar from '@/components/rider/RiderAvatar'
import type { RiderProfile } from '@/types/routeGroup'

interface SuggestionListProps {
  id: string
  label: string
  /** The element that the hook showing the list in the top layer works on. */
  listRef: RefObject<HTMLUListElement | null>
  riders: readonly RiderProfile[]
  activeRider: RiderProfile | undefined
  onPick: (rider: RiderProfile) => void
}

export const getOptionId = (listId: string, rider: RiderProfile): string => `${listId}-${rider.id}`

/** The riders offered under a username field (listbox popover). Pressing one keeps the focus in the field. */
export default function SuggestionList({ id, label, listRef, riders, activeRider, onPick }: SuggestionListProps) {
  return (
    <ul
      ref={listRef}
      id={id}
      className="suggestion-list"
      role="listbox"
      aria-label={label}
      popover="manual"
      onMouseDown={(event) => event.preventDefault()}
    >
      {riders.map((rider) => (
        <li
          key={rider.id}
          id={getOptionId(id, rider)}
          className="suggestion-option"
          role="option"
          aria-selected={rider.id === activeRider?.id}
          onClick={() => onPick(rider)}
        >
          <RiderAvatar rider={rider} size="sm" />
          {rider.username}
        </li>
      ))}
    </ul>
  )
}
