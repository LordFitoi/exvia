import type { ReactNode } from 'react'

interface StateViewProps {
  title: string
  description: string
  children: ReactNode
  /** A button or link that offers the next step, shown under the description. */
  action?: ReactNode
}

export default function StateView({ title, description, children, action }: StateViewProps) {
  return (
    <div className="state-view">
      <span className="list-item-icon list-item-icon-lg list-item-icon-primary" aria-hidden="true">
        {children}
      </span>
      <h2 className="text-subtitle">{title}</h2>
      <p className="text-small text-muted">{description}</p>
      {action}
    </div>
  )
}
