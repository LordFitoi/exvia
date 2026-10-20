'use client'

import RiderAvatar from '@/components/rider/RiderAvatar'
import { useMenuPopover } from '@/hooks/useMenuPopover'
import type { RiderProfile } from '@/types/routeGroup'

interface RiderRowProps {
  rider: RiderProfile
  /** What the row says under the name, such as "Invited". */
  meta?: string
  /** Centers the map on the rider; only riders on the map have it. */
  onFocus?: () => void
  /** Hands the leadership to the rider; only the leader has it, and only for riders who are riding. */
  onPromote?: () => void
  /** Takes the rider out of the group; only the leader has it. */
  onRemove?: () => void
  isSelected?: boolean
  onToggleSelected?: () => void
}

function RiderBody({ rider, meta }: Pick<RiderRowProps, 'rider' | 'meta'>) {
  return (
    <>
      <RiderAvatar rider={rider} size="sm" />
      <span className="list-item-body">
        <span className="list-item-title">{rider.username}</span>
        {meta && <span className="list-item-meta">{meta}</span>}
      </span>
    </>
  )
}

type RiderMenuProps = Pick<RiderRowProps, 'rider' | 'onFocus' | 'onPromote' | 'onRemove'>

/** The more-options button of the selected rider: a menu with what can be done to them. */
function RiderMenu({ rider, onFocus, onPromote, onRemove }: RiderMenuProps) {
  const { isOpen, rootRef, triggerRef, panelProps, toggle, close } = useMenuPopover({ isInTopLayer: true })

  const handleChoose = (action: () => void) => {
    close()
    action()
  }

  return (
    <div className="menu" ref={rootRef}>
      <button
        ref={triggerRef}
        className="icon-button"
        type="button"
        aria-label={`More options for ${rider.username}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelProps.id : undefined}
        onClick={toggle}
      >
        <span className="icon icon-more" aria-hidden="true"></span>
      </button>
      {isOpen && (
        <ul className="menu-panel" aria-label={rider.username} {...panelProps}>
          {onFocus && (
            <li role="none">
              <button className="menu-item" type="button" role="menuitem" onClick={() => handleChoose(onFocus)}>
                <span className="icon icon-locate" aria-hidden="true"></span>
                Center the map on {rider.username}
              </button>
            </li>
          )}
          {onPromote && (
            <li role="none">
              <button className="menu-item" type="button" role="menuitem" onClick={() => handleChoose(onPromote)}>
                <span className="icon icon-crown" aria-hidden="true"></span>
                Promote to leader
              </button>
            </li>
          )}
          {onRemove && (
            <li role="none">
              <button
                className="menu-item menu-item-danger"
                type="button"
                role="menuitem"
                onClick={() => handleChoose(onRemove)}
              >
                <span className="icon icon-trash" aria-hidden="true"></span>
                Remove {rider.username}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

/**
 * A rider of the ride. A row with something to do (center the map on them, promote them, or remove them) is
 * selectable: selecting it shows the more-options menu, so removing someone is never one tap away.
 * A row with nothing to do is plain.
 */
export default function RiderRow({
  rider,
  meta,
  onFocus,
  onPromote,
  onRemove,
  isSelected = false,
  onToggleSelected,
}: RiderRowProps) {
  if (!onFocus && !onPromote && !onRemove) {
    return (
      <li className="list-item">
        <RiderBody rider={rider} meta={meta} />
      </li>
    )
  }

  return (
    <li className="list-item list-item-split">
      <button className="list-item-main" type="button" aria-pressed={isSelected} onClick={onToggleSelected}>
        <RiderBody rider={rider} meta={meta} />
      </button>
      {isSelected && <RiderMenu rider={rider} onFocus={onFocus} onPromote={onPromote} onRemove={onRemove} />}
    </li>
  )
}
