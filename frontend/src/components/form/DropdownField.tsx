'use client'

import { useId, useState } from 'react'
import type { CSSProperties } from 'react'

import FieldMessage from '@/components/form/FieldMessage'
import { useDropdown } from '@/hooks/useDropdown'

export interface DropdownOption {
  /** What the form sends; may be empty for a "none" choice. */
  readonly value: string
  readonly label: string
  /** Takes a full row of a compact menu, for a "none" choice. */
  readonly isWide?: boolean
}

interface DropdownFieldProps {
  name: string
  label: string
  options: readonly DropdownOption[]
  /** The value that starts chosen. */
  defaultValue: string
  /** Lays the options out in this many columns, for short values; one per row when not given. */
  columns?: number
  error?: string
}

/** The guide's custom dropdown as a form field: the chosen option is sent under `name` like a select's. */
export default function DropdownField({ name, label, options, defaultValue, columns, error }: DropdownFieldProps) {
  const [value, setValue] = useState(defaultValue)
  const { isOpen, rootRef, summaryRef, menuRef, toggle, close, handleMenuKeyDown } = useDropdown()
  const id = useId()
  const labelId = `${id}-label`
  const valueId = `${id}-value`
  const messageId = `${id}-message`
  const chosen = options.find((option) => option.value === value) ?? options[0]
  const menuStyle: CSSProperties & Record<'--columns', number | undefined> = { '--columns': columns }

  const handlePick = (option: DropdownOption) => {
    setValue(option.value)
    close()
  }

  return (
    <div className="field">
      <span className="field-label" id={labelId}>
        {label}
      </span>
      <input type="hidden" name={name} value={value} />
      <details ref={rootRef} className="dropdown" open={isOpen}>
        <summary
          ref={summaryRef}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={`${labelId} ${valueId}`}
          aria-describedby={error ? messageId : undefined}
          onClick={(event) => {
            event.preventDefault()
            toggle()
          }}
        >
          <span id={valueId}>{chosen?.label}</span>
          <span className="icon icon-chevron-down" aria-hidden="true"></span>
        </summary>
        <ul
          ref={menuRef}
          className={columns ? 'dropdown-menu dropdown-menu-grid' : 'dropdown-menu'}
          style={menuStyle}
          role="listbox"
          aria-labelledby={labelId}
          popover="manual"
          onKeyDown={handleMenuKeyDown}
        >
          {options.map((option) => (
            <li key={option.value} className={option.isWide ? 'dropdown-item-wide' : undefined} role="presentation">
              <button
                className="dropdown-option"
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => handlePick(option)}
              >
                {option.label}
                {option.value === value && <span className="icon icon-check" aria-hidden="true"></span>}
              </button>
            </li>
          ))}
        </ul>
      </details>
      <FieldMessage id={messageId} error={error} />
    </div>
  )
}
