/** What the rider chose to ride: one of their routes, no route at all, or no route while recording the track. */
export type RideSelection =
  | { readonly kind: 'free' }
  | { readonly kind: 'track' }
  | { readonly kind: 'route'; readonly id: string }
