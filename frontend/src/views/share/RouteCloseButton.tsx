'use client'

import Link from 'next/link'

import { useAuth } from '@/hooks/useAuth'

const MAP_PATH = '/map'

/**
 * Over the top right of the map. A signed-in rider goes back to the Map tab, where their own map is; a visitor
 * gets an X that closes the tab (a browser only lets a script close a tab that a script opened, so it may do nothing).
 */
export default function RouteCloseButton() {
  const { status } = useAuth()

  if (status === 'loading') return null

  return (
    <div className="map-overlay">
      <div className="map-controls">
        {status === 'authenticated' ? (
          <Link className="icon-button" href={MAP_PATH} aria-label="Back to the map">
            <span className="icon icon-chevron-left" aria-hidden="true"></span>
          </Link>
        ) : (
          <button className="icon-button" type="button" aria-label="Close" onClick={() => window.close()}>
            <span className="icon icon-x" aria-hidden="true"></span>
          </button>
        )}
      </div>
    </div>
  )
}
