import StateView from '@/components/feedback/StateView'

interface LoadFailedStateProps {
  /** What could not load, such as "Could not load your clans". */
  title: string
  onRetry: () => void
}

export default function LoadFailedState({ title, onRetry }: LoadFailedStateProps) {
  return (
    <StateView
      title={title}
      description="Check your connection and try again."
      action={
        <button className="button button-soft" type="button" onClick={onRetry}>
          Try again
        </button>
      }
    >
      <span className="icon icon-lg icon-alert"></span>
    </StateView>
  )
}
