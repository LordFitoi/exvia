const VIEWPORT_MARGIN_PX = 8
// The gap of `--space-2` that the guide's suggestion list keeps from its field.
const FIELD_GAP_PX = 8

/**
 * Places a suggestion list that is fixed in the top layer under its input, as wide as the input:
 * flipped above it when it does not fit below, and never outside the screen.
 */
export const placeSuggestionList = (input: HTMLElement, list: HTMLElement): void => {
  const anchor = input.getBoundingClientRect()
  list.style.width = `${anchor.width}px`
  list.style.left = `${anchor.left}px`

  const below = anchor.bottom + FIELD_GAP_PX
  const fitsBelow = below + list.offsetHeight <= window.innerHeight - VIEWPORT_MARGIN_PX
  const top = fitsBelow ? below : anchor.top - FIELD_GAP_PX - list.offsetHeight
  list.style.top = `${Math.max(VIEWPORT_MARGIN_PX, top)}px`
}
