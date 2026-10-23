import type { ReactNode } from 'react'

interface PlaceCardProps {
  title: string
  /** The line under the title. */
  subtitle: ReactNode
  iconClass: string
  /** What the card says and offers under its header. */
  children: ReactNode
  onClose: () => void
}

/** The floating card at the bottom of the map that describes one spot or saved place. */
export default function PlaceCard({ title, subtitle, iconClass, children, onClose }: PlaceCardProps) {
  return (
    <section className="place-card" aria-label={title}>
      <div className="place-card-header">
        <span className="list-item-icon list-item-icon-primary">
          <span className={`icon ${iconClass}`} aria-hidden="true"></span>
        </span>
        <div className="list-item-body">
          <h2 className="list-item-title">{title}</h2>
          <p className="list-item-meta">{subtitle}</p>
        </div>
        <button className="icon-button" type="button" aria-label="Close place details" onClick={onClose}>
          <span className="icon icon-x" aria-hidden="true"></span>
        </button>
      </div>
      {children}
    </section>
  )
}
