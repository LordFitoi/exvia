export const NO_ACTIVE_OPTION = -1

/**
 * The option that an arrow key moves to, wrapping around at both ends. With no option active, down
 * goes to the first one and up to the last one.
 */
export const stepActiveOption = (activeIndex: number, step: number, count: number): number => {
  if (activeIndex === NO_ACTIVE_OPTION) return step > 0 ? 0 : count - 1
  return (activeIndex + step + count) % count
}
