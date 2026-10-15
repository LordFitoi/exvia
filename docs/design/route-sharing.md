# Route sharing

A public page for one route, reachable by anyone who has its link, signed in
or not, with a link preview (Open Graph) that shows the route on a map in
WhatsApp, Instagram, X and the like. The route itself, and the `Route`
primary key that makes the link safe to hand out, are in [routes.md](routes.md);
the app shell it deliberately does **not** use is in
[frontend-screens.md](frontend-screens.md).

## The link

`https://<app domain>/routes/<route uuid>/`

`Route.id` is a UUID4 (see [routes.md](routes.md#data-model)), so the link
cannot be guessed or walked through: **the UUID is the secret**. Anyone who is
given it can read the route; nobody can list or find routes they were not
given. The page is `noindex` for the same reason (see
[Metadata](#metadata)).

## Pieces

| Piece | File | Job |
|-------|------|-----|
| API | `SharedRouteView` in [views.py](../../apps/routes/views.py), `SharedRouteSerializer` | `GET /api/routes/<uuid>/shared/`, no login |
| Fetch | [sharedRouteApi.ts](../../frontend/src/services/sharedRouteApi.ts) | Server-side fetch of that endpoint, validated and cached; `null` when there is no such route |
| Page | `app/routes/[id]/page.tsx` | `generateMetadata`, and the page behind `<Suspense>` |
| Preview image | `app/routes/[id]/opengraph-image.ts` | The picture a link preview shows |
| View | `views/share/RouteShareView.tsx` | Map on top, panel below |
| Panel | `views/share/RouteSharePanel.tsx` | Name, author, distance, estimated time, date, description |
| Map | `components/route/PreviewMap.tsx` | The route map, shared with the route list and the ride picker |
| Image URL | `services/staticMapUrl.ts`, `polyline.ts`, `simplifyPath.ts` | Builds the Mapbox Static Images URL |
| Site URL | `services/siteConfig.ts` | `SITE_URL`, the base of every absolute URL in the metadata |

## API

`GET /api/routes/<uuid>/shared/` is `AllowAny` and has **no authentication
classes**: a stale or expired token in the browser's headers is ignored
instead of turning a public read into a `401`. It is read-only (other methods
are `405`) and `404` for an unknown UUID. An integer, or anything that is not a
UUID, never reaches the view: the URL converter is `<uuid:pk>`.

```json
{
  "id": "2dfd2b39-b5ba-4389-b76d-25adf7a15414",
  "name": "Sunday loop",
  "description": "Easy ride",
  "points": [[-3.7038, 40.4168], [-3.6912, 40.4221]],
  "distance": 1.223,
  "estimated_time": 73,
  "author": "rider",
  "created_at": "2026-10-13T18:00:00Z"
}
```

It is the route without `waypoints`, and with the author's **username** in
place of the user id: a link holder learns who drew the route and nothing else
about them (no id, no email). The private `GET /api/routes/<uuid>/` is
unchanged and still only returns the caller's own routes.

## The page

- Not in the `(app)` group: no `AuthGuard`, no `AppShell`, no tab bar. It is a
  `.app-shell` of its own, so a visitor with no account sees the route at once.
- Layout is the ride screen's: the map fills the height the panel leaves and
  the panel sits **below** it in the flow, so it never covers the route (the
  map frames the route inside the space above the panel). The panel is the
  guide's `.map-panel`: a flat block with square corners, no drag handle and no
  slide-in, since there is nothing to collapse; it holds the three-tile
  `.route-stats` row. Dark mode follows the map style and the tokens.
- A route that does not exist renders the app's not-found screen. The status
  code is `200`, not `404`: the data is read inside `<Suspense>` (the route is
  dynamic, `params` cannot be awaited outside it with Cache Components), so
  the response has started by the time the route is known.
- The route comes from the server (`fetchSharedRoute`, `'use cache'`,
  `cacheLife('minutes')`) and goes to the client as props, which keeps the
  page and its metadata from asking the API twice. A failed request throws and
  is not cached. The path is validated as a UUID first, so the URL segment
  can never change the backend path being fetched.

## Metadata

`generateMetadata` sets `title`, `description`
(`"2.2 km · 2 min · by rider. <description>"`), `robots: noindex, nofollow`,
`openGraph` and `twitter` (`summary_large_image`). The image tags
(`og:image`, `twitter:image`, with type, width, height and alt) come from the
`opengraph-image` file convention. They are absolute URLs: link previews cannot
follow a relative one, so the root layout sets `metadataBase` from `SITE_URL`.

**`SITE_URL`** is the public address (`https://exvia.up.railway.app` on
Railway, declared in [railway.ts](../../.railway/railway.ts); default
`http://localhost:3000`). If it is wrong, previews point at the wrong host.

### The preview image

`opengraph-image.ts` returns a PNG that **Mapbox draws** (Static Images API,
`dark-v11`, the route as a 6px line in the primary green with a light-green
`a` pin at the start and `b` pin at the finish, framed with `auto` and 80px padding).
The route handler fetches it and passes the bytes through; the token never
reaches the preview, only the exact image does.

- **1200×630 on the dark style.** The size is the standard Open Graph one
  (1.91:1). The dark style is deliberate: it matches the app's dark theme and
  is also far lighter than the light one, which came out at ~350 KB at this
  size for a dense city. WhatsApp drops to a small thumbnail above ~300 KB;
  the dark PNG is ~110 KB. PNG weight follows pixel count and map detail, so
  if the style or size changes, re-measure.
- **The path is thinned to fit the URL.** Mapbox refuses URLs over 8,192
  characters and a street path has up to 20,000 points. `simplifyPath`
  (Douglas-Peucker, iterative) is run with a growing tolerance until the
  URL-encoded polyline is under 6,000 characters; a typical route is not
  touched at all. 20,000 points take about 140 ms. The line only has to look
  right at the size of the image, so the stored path is never changed.
- `polyline.ts` writes the encoded polyline format at 5 decimals, latitude
  first: that is the order Mapbox reads, the reverse of the `[lng, lat]` the
  app stores.
- Unknown route: `404`. Mapbox failing or timing out: `502`, logged without
  the URL (it carries the access token). Cached by browsers for an hour;
  platforms keep their own copy of a preview for much longer, so an edited
  route may keep its old picture in a chat until they refresh.
- It needs `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` at runtime on the server. A token
  restricted to the app's URL (as [frontend.md](frontend.md) recommends) would
  refuse a server request that sends no `Referer`; the token in use today
  accepts such requests (tested). Check this if previews stop showing an image after the token
  is locked down.

## Key decisions

- **UUID as the capability**, not a separate share token: one identifier,
  nothing to rotate or store, and the public page needs no extra table. The
  cost is that a link cannot be revoked without deleting or recreating the
  route. A per-route "shared" switch or a separate token would fix that, and is
  not built.
- **Every route is reachable by its link.** There is no private flag. The
  private API still only lists the owner's routes, so a link is never revealed
  by anything the app shows other users.
- **Server-rendered for crawlers.** WhatsApp, Instagram and others do not run
  JavaScript, so the tags have to be in the HTML. Metadata for bots is not
  streamed by Next, so they get the title and image tags in the first bytes.
- **Own image route instead of pointing `og:image` at Mapbox**: the URL is on
  the app's domain, stable, and keeps the token out of the page source.
- **The link is given from the route list**: its Share button
  ([route-management.md](route-management.md#share)) is the only place the app
  hands out a route's link.
