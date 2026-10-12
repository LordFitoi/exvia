import type { ReactNode } from 'react'

interface StateViewProps {
  title: string
  description: string
  children: ReactNode
}

export default function StateView({ title, description, children }: StateViewProps) {
  return (
    <div className="state-view">
      <span className="list-item-icon list-item-icon-lg list-item-icon-primary" aria-hidden="true">
        {children}
      </span>
      <h2 className="text-subtitle">{title}</h2>
      <p className="text-small text-muted">{description}</p>
    </div>
  )
}
