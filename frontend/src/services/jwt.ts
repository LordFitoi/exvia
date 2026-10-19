const MS_PER_SECOND = 1000

/** When a JWT expires, in milliseconds since the epoch; null when it cannot be read (the server decides then). */
export const getTokenExpiry = (token: string): number | null => {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const claims: unknown = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    const expiry = typeof claims === 'object' && claims !== null && 'exp' in claims ? claims.exp : null
    return typeof expiry === 'number' ? expiry * MS_PER_SECOND : null
  } catch {
    return null
  }
}
