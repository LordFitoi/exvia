'use client'

import { useMenuPopover } from '@/hooks/useMenuPopover'

interface RouteMenuProps {
  onCreate: () => void
  onPreview: () => void
  onHistory: () => void
}

/** The route button of the map controls: opens a menu to create a route, browse the saved ones or see the ride history. */
export default function RouteMenu({ onCreate, onPreview, onHistory }: RouteMenuProps) {
  const { isOpen, panelId, rootRef, triggerRef, toggle, close, handleKeyDown } = useMenuPopover()

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
        aria-label="Routes"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={toggle}
      >
        <span className="icon icon-route" aria-hidden="true"></span>
      </button>
      {isOpen && (
        <ul className="menu-panel" id={panelId} role="menu" aria-label="Routes" onKeyDown={handleKeyDown}>
          <li role="none">
            <button className="menu-item" type="button" role="menuitem" onClick={() => handleChoose(onCreate)}>
              <span className="icon icon-plus" aria-hidden="true"></span>
              Create a new route
            </button>
          </li>
          <li role="none">
            <button className="menu-item" type="button" role="menuitem" onClick={() => handleChoose(onPreview)}>
              <span className="icon icon-list" aria-hidden="true"></span>
              Preview routes
            </button>
          </li>
          <li role="none">
            <button className="menu-item" type="button" role="menuitem" onClick={() => handleChoose(onHistory)}>
              <span className="icon icon-calendar" aria-hidden="true"></span>
              Ride history
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
