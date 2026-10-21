interface FieldMessageProps {
  id: string
  error?: string
  hint?: string
}

/** What a field says under itself: its error (announced at once), or else its hint. */
export default function FieldMessage({ id, error, hint }: FieldMessageProps) {
  if (error) {
    return (
      <p className="field-error" id={id} role="alert">
        {error}
      </p>
    )
  }
  return (
    hint && (
      <p className="field-hint" id={id}>
        {hint}
      </p>
    )
  )
}
