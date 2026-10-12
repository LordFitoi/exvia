# Frontend screens and navigation

The mobile app shell in [frontend/](../../frontend/): five screens, a
session kept in the browser, and a bottom tab bar that exists only while
logged in. Screens use the guide's CSS and patterns
([ui-ux-style-guide.md](ui-ux-style-guide.md)); the API is the one described
in [authentication.md](authentication.md).

## Routes

Two route groups under `src/app/`. Groups add no URL segment; each has a
layout that wraps its pages in `AuthGuard`.

| Group | Path | Screen | Guard |
|-------|------|--------|-------|
| `(auth)` | `/login` | Log in | anonymous only |
| `(auth)` | `/signup` | Create account | anonymous only |
| `(app)` | `/` | Home | authenticated only |
| `(app)` | `/clans` | Clans | authenticated only |
| `(app)` | `/profile` | Profile, with log out | authenticated only |

- Logged out: only login and signup are reachable. Any other path redirects
  to `/login`, and there is no tab bar.
- Logged in: `(app)/layout.tsx` renders `TabBar` under every screen (Home,
  Clans, Profile; Home first and Profile last for Serial Position, 3 items for
  Hick and Miller). `/login` and `/signup` redirect to `/`.
- The current tab is marked with `aria-current="page"`, which the guide's CSS
  styles. Paths are compared without the trailing slash because
  `trailingSlash: true` is set in [next.config.ts](../../frontend/next.config.ts).

## Session

Tokens live in the browser, not in cookies, because the guide's single-origin
setup proxies `/api/` straight to Django and the backend only issues JWTs in
JSON bodies.

| Piece | File | Job |
|-------|------|-----|
| Types, guards | `types/auth.ts`, `services/typeGuards.ts` | Shapes of `User` and `TokenPair`; runtime checks for API responses |
| HTTP | `services/apiClient.ts` | `requestJson`; turns DRF error bodies into `ApiError` with per-field messages |
| Endpoints | `services/authApi.ts` | token, refresh, signup, `me` |
| Storage | `services/tokenStorage.ts` | `localStorage` read/write, every access in try/catch |
| Session logic | `services/session.ts` | `startSession`, `restoreSession`, `endSession` |
| React state | `context/AuthProvider.tsx`, `hooks/useAuth.ts` | `status` (`loading`, `authenticated`, `anonymous`), `user`, `login`, `signup`, `logout` |

- **Restore on load**: `restoreSession` calls `me/` with the stored access
  token. On a 401 it refreshes once and retries; the rotated pair is saved. If
  the refresh also fails with 401, the tokens are cleared. Network errors do
  not clear tokens, so being offline does not log the user out; the app shows
  the login screen and a reload recovers.
- **Signup** calls `signup/`, then logs in with the same credentials (the
  endpoint does not return tokens).
- **Logout** clears the tokens and sets `anonymous`; `AuthGuard` then
  redirects to `/login`. There is no server-side revocation yet (see
  "Not included" in [authentication.md](authentication.md)).
- **Loading**: while `status` is `loading`, `AuthGuard` renders a skeleton
  instead of the page, so a protected screen never flashes to a logged-out
  visitor.

## Forms

`useFormSubmission` reads the form with `FormData` (inputs are uncontrolled),
runs the submit action, and maps an `ApiError` to either field errors (only
for the names the form owns) or one form-level alert. Fields come from
`TextField` (label above, `aria-invalid`, `role="alert"` message) and the
submit button shows the guide's `button-loading` state. Login uses the
username (what `token/` accepts), not the email.

Every request has a 15 second timeout (`requestJson`). A backend that accepts
the connection but never answers would otherwise leave the login button
spinning, or the app on its loading skeleton at startup, forever; now it ends
with "The server is taking too long to respond" (or, at startup, the login
screen).

## Placeholder content

Home and Clans have no backend endpoints yet, so they show the guide's empty
`state-view`s ("No rides planned", "No clans yet"). Profile shows what
`me/` returns: username and email. Replace the empty states when the
serializers and endpoints for rides, notices and clans exist.

## Styling

The product CSS of the guide is copied to
`frontend/src/styles/exvia-ui/` (everything `exvia-ui.css` imports, plus the
vendored fonts) and imported once in the root layout. The guide's own pages
(`styleguide.css`, `specimens.css`, `devices.css`, `theme.js`) are not copied.
`globals.css` only adds the app shell: a column capped at `--app-max-width`
and the screen body spacing. Light and dark follow `prefers-color-scheme`
through the guide's tokens. Components use the guide's class names directly
instead of Tailwind utilities.

## Key decisions

- **Copy, not import, the guide CSS**: Railway builds `frontend/` as its own
  root directory, so files under `docs/` are not available at build time. When
  `docs/ui-ux/` changes, copy the changed files over; the two copies are
  otherwise identical.
- **Client-side guard, not `proxy.ts`**: the session is not in a cookie, so the
  server cannot tell who is asking. Pages are static shells and the guard
  decides in the browser. Moving tokens to httpOnly cookies set by Next route
  handlers would allow a server-side redirect; it was not done because it
  changes the transport for every API call.
- **`instant = false` on each page**: with `cacheComponents` on, Next
  validates that every page renders into the static shell. The guard
  deliberately renders only a skeleton until the session resolves, so the
  validator reports the page as dropped. Opting out removes that dev-overlay
  error; navigations are still instant because the skeleton is static.
- **Page error boundary**: `app/error.tsx` shows the guide's error state with
  a retry button for any unhandled render error.
