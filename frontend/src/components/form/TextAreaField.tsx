import { useId } from 'react'

interface TextAreaFieldProps {
  name: string
  label: string
  maxLength: number
  error?: string
  defaultValue?: string
}

export default function TextAreaField({ name, label, maxLength, error, defaultValue }: TextAreaFieldProps) {
  const id = useId()
  const messageId = `${id}-message`

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <textarea
        className="textarea"
        id={id}
        name={name}
        maxLength={maxLength}
        defaultValue={defaultValue}
        aria-invalid={Boolean(error)}
        aria-describedby={messageId}
      />
      {error ? (
        <p className="field-error" id={messageId} role="alert">
          {error}
        </p>
      ) : (
        <p className="field-hint" id={messageId}>
          {maxLength} characters max.
        </p>
      )}
    </div>
  )
}
