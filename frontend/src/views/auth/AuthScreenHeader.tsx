import type { ReactNode } from 'react'

interface AuthScreenHeaderProps {
  title: string
  subtitle: string
  children: ReactNode
}

export default function AuthScreenHeader({ title, subtitle, children }: AuthScreenHeaderProps) {
  return (
    <div className="profile-header">
      <span className="list-item-icon list-item-icon-lg list-item-icon-primary" aria-hidden="true">
        {children}
      </span>
      <h1 className="text-heading">{title}</h1>
      <p className="text-small text-muted">{subtitle}</p>
    </div>
  )
}
