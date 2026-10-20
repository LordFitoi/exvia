const VIEWPORT_MARGIN_PX = 8
// The gap of `--space-2` that the guide's menu keeps from its button.
const TRIGGER_GAP_PX = 8

/**
 * Places a menu panel that is fixed in the top layer next to its button: below it with the right edges
 * aligned, flipped above when it does not fit below, and never outside the screen.
 */
export const placeMenuPanel = (trigger: HTMLElement, panel: HTMLElement): void => {
  const anchor = trigger.getBoundingClientRect()
  const { offsetWidth: width, offsetHeight: height } = panel
  const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN_PX
  const below = anchor.bottom + TRIGGER_GAP_PX
  const fitsBelow = below + height <= window.innerHeight - VIEWPORT_MARGIN_PX
  const top = fitsBelow ? below : anchor.top - TRIGGER_GAP_PX - height

  panel.style.left = `${Math.max(VIEWPORT_MARGIN_PX, Math.min(anchor.right - width, maxLeft))}px`
  panel.style.top = `${Math.max(VIEWPORT_MARGIN_PX, top)}px`
}
