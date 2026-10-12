interface FormAlertProps {
  message: string | null
}

export default function FormAlert({ message }: FormAlertProps) {
  if (!message) return null

  return (
    <div className="alert alert-error" role="alert">
      <span className="icon icon-alert" aria-hidden="true"></span>
      {message}
    </div>
  )
}
