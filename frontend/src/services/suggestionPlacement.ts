const VIEWPORT_MARGIN_PX = 8
// The gap of `--space-2` that the guide's suggestion list keeps from its field.
const FIELD_GAP_PX = 8

interface VisibleBand {
  readonly top: number
  readonly bottom: number
}

/**
 * The part of the screen the person can see, in the coordinates of fixed elements. A phone keyboard
 * covers the bottom of the page without resizing it, so the window's height is not what is left.
 */
const getVisibleBand = (): VisibleBand => {
  const viewport = window.visualViewport
  if (!viewport) return { top: 0, bottom: window.innerHeight }
  return { top: viewport.offsetTop, bottom: viewport.offsetTop + viewport.height }
}

/**
 * Places a suggestion list that is fixed in the top layer under its input, as wide as the input: above
 * it when there is more room there, and never outside the visible screen (the keyboard is not part of
 * it). The list is as tall as its options, up to the room there is; past that it scrolls inside itself.
 */
export const placeSuggestionList = (input: HTMLElement, list: HTMLElement): void => {
  const anchor = input.getBoundingClientRect()
  const band = getVisibleBand()
  list.style.width = `${anchor.width}px`
  list.style.left = `${anchor.left}px`
  list.style.maxHeight = 'none'

  const below = anchor.bottom + FIELD_GAP_PX
  const roomBelow = band.bottom - VIEWPORT_MARGIN_PX - below
  const roomAbove = anchor.top - FIELD_GAP_PX - (band.top + VIEWPORT_MARGIN_PX)
  const isBelow = list.offsetHeight <= roomBelow || roomBelow >= roomAbove
  const room = Math.max(0, isBelow ? roomBelow : roomAbove)

  list.style.maxHeight = `${room}px`
  list.style.top = `${isBelow ? below : anchor.top - FIELD_GAP_PX - list.offsetHeight}px`
}
