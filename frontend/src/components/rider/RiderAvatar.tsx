import Image from 'next/image'

import { getInitials } from '@/services/riderInitials'
import type { RiderProfile } from '@/types/routeGroup'

const AVATAR_PIXELS = 40
const SMALL_AVATAR_PIXELS = 32

interface RiderAvatarProps {
  rider: Pick<RiderProfile, 'username' | 'avatar'>
  /** `sm` is the compact disc of list rows; `md` the regular one. */
  size?: 'sm' | 'md'
}

/** The rider's picture in a disc, or their initials when they have none. The name is always next to it. */
export default function RiderAvatar({ rider, size = 'md' }: RiderAvatarProps) {
  const className = size === 'sm' ? 'avatar avatar-sm' : 'avatar'
  const pixels = size === 'sm' ? SMALL_AVATAR_PIXELS : AVATAR_PIXELS
  return (
    <span className={className} aria-hidden="true">
      {rider.avatar ? (
        <Image src={rider.avatar} alt="" width={pixels} height={pixels} unoptimized />
      ) : (
        getInitials(rider.username)
      )}
    </span>
  )
}
