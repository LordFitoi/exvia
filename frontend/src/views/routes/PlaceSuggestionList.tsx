'use client'

import type { RefObject } from 'react'

import type { PlaceCompletion } from '@/hooks/usePlaceCompletion'
import type { SuggestionStatus } from '@/hooks/usePlaceSuggestions'
import { formatMeters } from '@/services/formatRoute'
import type { PlaceSuggestion } from '@/types/place'

const CATEGORY_HINT = 'Category · nearest first'
const SAVED_HINT = 'Saved'
const FAILED_MESSAGE = "Couldn't search places. Check your connection and try again."
// Said while there is no row to show: nothing is said before a search starts or while rows are listed.
const STATUS_MESSAGES: Readonly<Record<SuggestionStatus, string | null>> = {
  idle: null,
  searching: 'Searching…',
  ready: 'No places found. Try another spelling, or paste the coordinates.',
  failed: FAILED_MESSAGE,
}

interface PlaceSuggestionListProps {
  listId: string
  listRef: RefObject<HTMLUListElement | null>
  completion: PlaceCompletion
}

export const getOptionId = (listId: string, { kind, id }: PlaceSuggestion): string => `${listId}-${kind}-${id}`

const describeSuggestion = (suggestion: PlaceSuggestion): string => {
  if (suggestion.kind === 'category') return CATEGORY_HINT
  const details = [suggestion.address, formatMeters(suggestion.distanceMeters)].filter(Boolean)
  return (suggestion.kind === 'saved' ? [SAVED_HINT, ...details] : details).join(' · ')
}

/** What the list says in place of rows, so a search that finds nothing never looks broken. */
const describeStatus = (status: SuggestionStatus, rowCount: number): string | null => {
  if (status === 'failed') return FAILED_MESSAGE
  return rowCount > 0 ? null : STATUS_MESSAGES[status]
}

interface PlaceOptionProps {
  id: string
  suggestion: PlaceSuggestion
  isActive: boolean
  onPick: (suggestion: PlaceSuggestion) => void
}

const PlaceOption = ({ id, suggestion, isActive, onPick }: PlaceOptionProps) => (
  <li
    id={id}
    className={suggestion.kind === 'saved' ? 'suggestion-option suggestion-option-saved' : 'suggestion-option'}
    role="option"
    aria-selected={isActive}
    onClick={() => onPick(suggestion)}
  >
    <span className="list-item-body">
      <span className="list-item-title">{suggestion.title}</span>
      <span className="list-item-meta">{describeSuggestion(suggestion)}</span>
    </span>
    {suggestion.kind === 'saved' && <span className={`icon icon-lg ${suggestion.iconClass}`} aria-hidden="true"></span>}
  </li>
)

interface PlaceListAnnouncementProps {
  completion: PlaceCompletion
}

/** Says aloud what the list shows, since a screen reader does not see the rows appear. */
const PlaceListAnnouncement = ({ completion }: PlaceListAnnouncementProps) => {
  const message = describeStatus(completion.status, completion.suggestions.length)
  const count = completion.suggestions.length
  const text = message ?? `${count} ${count === 1 ? 'suggestion' : 'suggestions'}`
  return (
    <span className="visually-hidden" role="status">
      {completion.isVisible ? text : ''}
    </span>
  )
}

/**
 * The places under the search field (the options of its combobox), or what to say when there are none:
 * searching, nothing found, or failed.
 */
export default function PlaceSuggestionList({ listId, listRef, completion }: PlaceSuggestionListProps) {
  const { suggestions, activeSuggestion } = completion
  const message = describeStatus(completion.status, suggestions.length)

  return (
    <>
      <PlaceListAnnouncement completion={completion} />
      <ul
        ref={listRef}
        id={listId}
        className="suggestion-list"
        role="listbox"
        aria-label="Place suggestions"
        aria-busy={completion.status === 'searching'}
        popover="manual"
        onMouseDown={(event) => event.preventDefault()}
      >
        {message && <li className="suggestion-status" role="presentation">{message}</li>}
        {suggestions.map((suggestion) => (
          <PlaceOption
            key={getOptionId(listId, suggestion)}
            id={getOptionId(listId, suggestion)}
            suggestion={suggestion}
            isActive={suggestion === activeSuggestion}
            onPick={completion.pick}
          />
        ))}
      </ul>
    </>
  )
}
