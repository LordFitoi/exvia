'use client'

import { useMenuPopover } from '@/hooks/useMenuPopover'

interface RouteRowMenuProps {
  routeName: string
  /** Only offered once the route's path has loaded, because the editor starts from it. */
  onEdit?: () => void
  onShare: () => void
  onDelete: () => void
}

/** The more-options button of the selected route row: a menu to edit, share or delete it. */
export default function RouteRowMenu({ routeName, onEdit, onShare, onDelete }: RouteRowMenuProps) {
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
        aria-label={`More options for ${routeName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelProps.id : undefined}
        onClick={toggle}
      >
        <span className="icon icon-more" aria-hidden="true"></span>
      </button>
      {isOpen && (
        <ul className="menu-panel" aria-label={routeName} {...panelProps}>
          {onEdit && (
            <li role="none">
              <button className="menu-item" type="button" role="menuitem" onClick={() => handleChoose(onEdit)}>
                <span className="icon icon-edit" aria-hidden="true"></span>
                Edit
              </button>
            </li>
          )}
          <li role="none">
            <button className="menu-item" type="button" role="menuitem" onClick={() => handleChoose(onShare)}>
              <span className="icon icon-share" aria-hidden="true"></span>
              Share
            </button>
          </li>
          <li role="none">
            <button
              className="menu-item menu-item-danger"
              type="button"
              role="menuitem"
              onClick={() => handleChoose(onDelete)}
            >
              <span className="icon icon-trash" aria-hidden="true"></span>
              Delete
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
