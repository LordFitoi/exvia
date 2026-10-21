'use client'

import { useId } from 'react'
import type { KeyboardEvent } from 'react'

import FieldMessage from '@/components/form/FieldMessage'
import SuggestionList, { getOptionId } from '@/components/form/SuggestionList'
import { useSuggestionPopover } from '@/hooks/useSuggestionPopover'
import { useUsernameCompletion } from '@/hooks/useUsernameCompletion'
import type { UsernameCompletion } from '@/hooks/useUsernameCompletion'

const KEY_STEPS: Readonly<Record<string, number>> = { ArrowDown: 1, ArrowUp: -1 }

interface UsernameFieldProps {
  name: string
  label: string
  error?: string
  hint?: string
  /** Riders that are not offered, such as the ones already invited. */
  excludedUsernames?: readonly string[]
}

/** Arrow keys move through the open list, Enter picks the active rider and Escape closes only the list. */
const handleCompletionKey = (event: KeyboardEvent<HTMLInputElement>, completion: UsernameCompletion) => {
  if (!completion.isVisible) return
  const step = KEY_STEPS[event.key]
  if (step !== undefined) {
    event.preventDefault()
    completion.move(step)
  } else if (event.key === 'Enter' && completion.activeRider) {
    event.preventDefault()
    completion.pick(completion.activeRider)
  } else if (event.key === 'Escape') {
    // Only the list closes: inside a dialog, the same key must not close the dialog as well.
    event.preventDefault()
    event.stopPropagation()
    completion.close()
  }
}

/**
 * A text field for the username of a rider that completes the name: the riders whose username starts
 * with what is typed are offered under the field (WAI-ARIA combobox with a list), and picking one fills
 * it in. Typing a whole name without picking works as well.
 */
export default function UsernameField({ name, label, error, hint, excludedUsernames = [] }: UsernameFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const listId = `${id}-suggestions`
  const completion = useUsernameCompletion(excludedUsernames)
  const { activeRider } = completion
  const { inputRef, listRef } = useSuggestionPopover(completion.isVisible, completion.close)

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="suggestions">
        <input
          ref={inputRef}
          className="input"
          id={id}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={completion.isVisible}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeRider ? getOptionId(listId, activeRider) : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? messageId : undefined}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          value={completion.value}
          onChange={(event) => completion.change(event.target.value)}
          onKeyDown={(event) => handleCompletionKey(event, completion)}
          onBlur={completion.close}
        />
        <SuggestionList
          id={listId}
          label={`${label} suggestions`}
          listRef={listRef}
          riders={completion.suggestions}
          activeRider={activeRider}
          onPick={completion.pick}
        />
      </div>
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  )
}
