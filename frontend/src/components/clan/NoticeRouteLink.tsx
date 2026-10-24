'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

import RouteItemBody from '@/components/route/RouteItemBody'
import type { SavedRoute } from '@/types/route'

const PREVIEW_WIDTH = 1200
const PREVIEW_HEIGHT = 630

interface NoticeRouteLinkProps {
  route: Pick<SavedRoute, 'id' | 'name' | 'distance' | 'estimated_time'>
}

/**
 * The route of a notice: its map preview (the Open Graph image of the shared page) above its name,
 * distance and time, all opening the route. Without the preview, the row stands alone.
 */
export default function NoticeRouteLink({ route }: NoticeRouteLinkProps) {
  const [hasPreviewFailed, setHasPreviewFailed] = useState(false)

  return (
    <Link className="notice-route" href={`/routes/${route.id}/`}>
      {!hasPreviewFailed && (
        <span className="notice-route-image">
          <Image
            src={`/routes/${route.id}/opengraph-image`}
            alt={`Map of ${route.name}`}
            width={PREVIEW_WIDTH}
            height={PREVIEW_HEIGHT}
            loading="lazy"
            unoptimized
            onError={() => setHasPreviewFailed(true)}
          />
        </span>
      )}
      <span className="list-item">
        <RouteItemBody route={route} />
        <span className="icon icon-chevron-right" aria-hidden="true"></span>
      </span>
    </Link>
  )
}
