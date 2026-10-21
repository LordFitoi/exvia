import { useId } from 'react'
import type { HTMLInputAutoCompleteAttribute, HTMLInputTypeAttribute } from 'react'

import FieldMessage from '@/components/form/FieldMessage'

interface TextFieldProps {
  name: string
  label: string
  type?: HTMLInputTypeAttribute
  autoComplete: HTMLInputAutoCompleteAttribute
  error?: string
  hint?: string
  maxLength?: number
  defaultValue?: string
}

export default function TextField({
  name,
  label,
  type = 'text',
  autoComplete,
  error,
  hint,
  maxLength,
  defaultValue,
}: TextFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const hasError = Boolean(error)

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        className="input"
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
        maxLength={maxLength}
        defaultValue={defaultValue}
        aria-invalid={hasError}
        aria-describedby={error || hint ? messageId : undefined}
      />
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  )
}
