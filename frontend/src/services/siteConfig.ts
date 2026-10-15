const DEFAULT_SITE_URL = 'http://localhost:3000'

/** The public address of the app, which link previews need in full: they cannot follow a relative URL. */
export const SITE_URL = process.env.SITE_URL ?? DEFAULT_SITE_URL
