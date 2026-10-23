/** The part of the map in view, in degrees. A `west` greater than `east` crosses the antimeridian. */
export interface Viewport {
  readonly west: number
  readonly south: number
  readonly east: number
  readonly north: number
}
