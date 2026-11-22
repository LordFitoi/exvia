/** How many pictures are kept decoded in memory; the oldest one is let go beyond this. */
const MAX_PRELOADED_AVATARS = 100

/** Held on to so the browser keeps the decoded picture and draws it at once when a row or a map bubble needs it. */
const preloaded = new Map<string, HTMLImageElement>()

const forgetOldest = (): void => {
  const oldest = preloaded.keys().next()
  if (!oldest.done) preloaded.delete(oldest.value)
}

const preloadAvatar = (url: string): void => {
  const image = new Image()
  image.decoding = 'async'
  image.onerror = () => preloaded.delete(url)
  image.src = url
  preloaded.set(url, image)
  if (preloaded.size > MAX_PRELOADED_AVATARS) forgetOldest()
}

/**
 * Starts loading profile pictures as soon as their URLs are known, so they are in the browser cache (and the
 * service worker's) before a screen shows them. Riders without a picture (null) and URLs already loaded are skipped.
 */
export const preloadAvatars = (urls: readonly (string | null)[]): void => {
  if (typeof Image === 'undefined') return
  for (const url of new Set(urls)) {
    if (url && !preloaded.has(url)) preloadAvatar(url)
  }
}
