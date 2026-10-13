interface SubmitButtonProps {
  label: string
  isPending: boolean
}

export default function SubmitButton({ label, isPending }: SubmitButtonProps) {
  const className = `button button-primary button-lg button-block${isPending ? ' button-loading' : ''}`

  return (
    <button className={className} type="submit" disabled={isPending} aria-busy={isPending}>
      {label}
    </button>
  )
}
