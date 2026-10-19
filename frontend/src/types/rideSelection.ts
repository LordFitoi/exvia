/** What the rider chose to ride: one of their routes, or no route at all. */
export type RideSelection =
  | { readonly kind: 'free' }
  | { readonly kind: 'route'; readonly id: string }
