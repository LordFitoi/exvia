'use client'

import StateView from '@/components/feedback/StateView'
import PreviewMap from '@/components/route/PreviewMap'
import type { RouteDetail } from '@/types/route'

interface RoutePreviewProps {
  /** `fill` takes the free height of its column; `compact` keeps a small fixed height. */
  size: 'fill' | 'compact'
  status: 'idle' | 'loading' | 'ready' | 'failed'
  /** The last route that loaded; kept on the map while the next one loads. */
  route: RouteDetail | null
  /** Free mode has no route to show, so the preview says so instead of asking for a selection. */
  isFreeMode?: boolean
  onRetry: () => void
}

export default function RoutePreview({ size, status, route, isFreeMode = false, onRetry }: RoutePreviewProps) {
  const className = `route-preview${size === 'fill' ? ' route-preview-fill' : ''}`
  return (
    <div className={className} aria-busy={status === 'loading'}>
      {status === 'failed' ? (
        <StateView
          title="Could not load this route"
          description="Check your connection and try again."
          action={
            <button className="button button-soft" type="button" onClick={onRetry}>
              Try again
            </button>
          }
        >
          <span className="icon icon-lg icon-alert"></span>
        </StateView>
      ) : route ? (
        <PreviewMap path={route.points} />
      ) : isFreeMode ? (
        <StateView title="Free mode" description="No route to follow: ride wherever you want.">
          <span className="icon icon-lg icon-navigation"></span>
        </StateView>
      ) : (
        <StateView
          title={status === 'loading' ? 'Loading route' : 'Select a route'}
          description="Pick one of your routes below to preview it on the map."
        >
          <span className="icon icon-lg icon-route"></span>
        </StateView>
      )}
    </div>
  )
}
