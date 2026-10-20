import type { EdgeIndicator } from '@/services/edgeIndicators'

import RiderAvatar from '@/components/rider/RiderAvatar'

const USER_LABEL = 'You'

interface EdgeIndicatorsProps {
  indicators: readonly EdgeIndicator[]
}

/**
 * A bubble on the map edge for the user and for each rider who is out of view, with an arrow pointing the
 * way to them. They are only a hint: they take no taps, so the map keeps every gesture.
 */
export default function EdgeIndicators({ indicators }: EdgeIndicatorsProps) {
  return indicators.map(({ key, rider, x, y, angle }) => (
    <span
      key={key}
      className={rider ? 'edge-indicator' : 'edge-indicator edge-indicator-me'}
      role="img"
      aria-label={rider ? `${rider.username} is off screen` : 'Your position is off screen'}
      style={{ insetInlineStart: x, insetBlockStart: y }}
    >
      {rider ? <RiderAvatar rider={rider} /> : <span className="avatar">{USER_LABEL}</span>}
      <span className="edge-indicator-pointer" style={{ rotate: `${angle}deg` }}></span>
    </span>
  ))
}
