# Map

The Map tab in [frontend/](../../frontend/): a full-bleed, monochrome
[Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) map centered on the
rider, with a dot and a "You" label at their current position, always
snapped to the nearest street, a [place search](#riding-to-a-place) at the top and a button that opens the
[route creator](#route-creator). The shell and
tab bar are described in [frontend-screens.md](frontend-screens.md); the map
components come from the style guide ([map.css](../ui-ux/map.css), "Map" in
[patterns.html](../ui-ux/patterns.html)).

## Route and pieces

`/map` (authenticated only, second tab, `icon-pin`).

| Piece | File | Job |
|-------|------|-----|
| Page | `app/(app)/map/page.tsx` | Renders `MapOverview` |
| Screen | `views/map/MapOverview.tsx` | Reads the position and picks the map or a waiting/blocked message |
| Map | `views/map/UserMap.tsx` | The canvas, the "center on me" button, the load-failure message |
| Message | `views/map/MapStatusView.tsx` | Title plus `StateView` under the "Map" heading |
| Position | `hooks/useGeolocation.ts` | `watchPosition` state: `pending`, `ready`, `denied`, `unavailable` |
| Street snap | `hooks/useStreetPosition.ts` | Snaps each GPS fix to the nearest street; keeps the last street position |
| Snap request | `services/streetSnapApi.ts` | Mapbox Directions call that returns the snapped point, or `null` |
| Search | `views/routes/PlaceSearch.tsx` | The same place search as the route creator, at the top of the map; picking a place shows it on the map with a card, from which the rider can [ride to it](#riding-to-a-place) |
| Destination ride | `views/map/DestinationRideView.tsx`, `hooks/useDestinationMap.ts`, `hooks/useDestinationArrival.ts` | Ride mode towards the picked place and its arrival summary (`views/map/DestinationSummarySheet.tsx`) |
| Mapbox | `hooks/useUserMap.ts` | Creates the map (through `useMapInstance`) and the "You" marker, keeps the marker on the latest position, and hands the created map to the places hooks |
| Places | `hooks/useMapPlaces.ts` and the [saved places](#saved-places) pieces | A press and hold drops a pin with a card; the rider's saved places show as icons |
| Map instance | `hooks/useMapInstance.ts` | Creates a map once the token is known, keeps it sized to its container, removes it on unmount; used by the creator and the [Ride](ride.md) maps |
| Base map | `services/baseMap.ts` | Shared by both maps: dynamic `mapbox-gl` import, style following the color scheme, 401 handling, the "You" marker element |
| Token | `services/mapboxConfig.ts` | Reads `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` for the map and the snap request |
| Types | `types/geolocation.ts` | `Coordinates`, `GeolocationState`, `StreetPositionState` |

## Behavior

- The map is only mounted once there is a first position, so it always opens
  centered on the rider (zoom 15). Until then, and when location is denied or
  unavailable, the screen shows a `StateView` explaining what to do instead of
  an empty map.
- The position is watched continuously (high accuracy). Each update moves the
  marker; the camera does not follow, so the rider can pan freely. The locate
  button (top right) flies back to the current position and resets the camera
  to the default view: zoom 15, flat (pitch 0) and north up (bearing 0).
- Only street positions are shown. Every fix is sent to the Mapbox Directions
  API as a zero-length `driving` route with a 50 m radius; the snapped
  waypoint is what the map and marker use, never the raw GPS point. A new fix
  aborts the previous request. With no street within 50 m (422 `NoSegment`)
  or a failed request, the marker stays on the last street position; if there
  has been none yet, the screen shows "Get on a street" or "Street not found"
  instead of the map.
- A timeout or lost signal after a first fix keeps the last known position;
  only a permission denial clears it.
- The marker is the guide's `marker-me` dot (pulsing halo) with a
  `marker-label` reading "You" below it. It is a plain DOM element handed to
  `mapboxgl.Marker`, anchored top-left because `marker-me` centers itself with
  `translate: -50% -50%`.
- Colors: `services/mapTheme.ts` repaints the loaded style's own layers with
  the style guide's map tokens (`--map-land`, `--map-building`, `--map-park`,
  `--map-water`, `--map-road`, `--map-road-casing`, `--map-road-major`,
  `--map-label`), on every `style.load` before the app
  adds its layers, so the route lines, the green dot, the label and the controls
  keep their colors. Layers are matched by type and id (background, water,
  park/landuse, `road-*`/`bridge-*`/`tunnel-*` with `-case` casings and
  motorway/trunk/primary as major roads, symbol text and halos). The tokens are
  read from the page (a probe element plus a one pixel canvas, since the
  browser may report `color-mix` as `color(srgb ...)`, which Mapbox cannot
  parse), so they follow the theme. The map is monochrome on purpose: only the
  palette's neutral greys, no green parks or blue water, so the route is the
  only color. The ground is a light neutral and lighter
  than the UI in dark mode, and the streets are darker than the ground in both
  themes, because a street matters more than a place. The base style is
  `light-v11` or `dark-v11` following `prefers-color-scheme`, switched live
  with `setStyle`; the marker survives because it is not part of the style.
- `mapbox-gl` is loaded with a dynamic `import()` after mount: it touches
  `window` on import, and the page is still prerendered. This also keeps it
  out of the other screens' bundles. Its CSS is imported by `UserMap.tsx`.
- Failures: a rejected import or a 401 from Mapbox (bad token) shows "Map
  unavailable"; a missing token logs to the console and shows the same
  message. Other tile errors are ignored (Mapbox retries them).

## Saved places

A rider can save any spot as a favorite place ([places.md](places.md)) and sees their saved places on
the map. `UserMap` calls `useMapPlaces(mounted)`, which composes the pieces below and returns the
`selection` (what the place card describes), `addPlace`, `removePlace`, `updatePlace`, `showPlace` (a place picked in the search) and `clearSelection`.

| Piece | File | Job |
|-------|------|-----|
| Long press | `hooks/useMapLongPress.ts` | Tells a press and hold from a tap and a drag |
| Pin and card | `hooks/usePinMarker.ts`, `views/map/PinPlaceCard.tsx`, `views/map/FoundPlaceCard.tsx`, `views/map/PlaceCard.tsx` | The pin on the pressed spot or searched place, and its card |
| Nearest business | `hooks/useNearestCommerce.ts`, `services/nearestCommerceApi.ts` | The business closest to the spot |
| Saved place | `views/map/SavedPlaceCard.tsx`, `views/map/EditPlaceSheet.tsx`, `hooks/usePlaceMarkers.ts`, `hooks/usePlaceDeletion.ts`, `services/placeLocationMarkers.ts` | One icon marker per saved place, and its card (edit it beside the close button, ride there, or delete it) |
| Save sheet | `views/map/SavePlaceSheet.tsx`, `views/map/PlaceFormSheet.tsx`, `components/form/CategoryField.tsx` | Name, category and notes (`PlaceFormSheet` is also the edit form) |
| Viewport | `hooks/usePlaceLocations.ts`, `services/viewport.ts`, `services/placeLocationsApi.ts` | Loads only the saved places in view |
| Categories | `services/placeLocationCategories.ts` | The fixed kinds, each with its label and icon |
| Camera | `hooks/useSelectionFocus.ts` | Centers the selected spot above the card |

- **Press and hold** (`useMapLongPress`): 500 ms on the map without moving more than 8 px (a finger
  never stays perfectly still) drops a pin at that spot and opens its card. A drag, a pinch (a second
  finger), a zoom, a rotation or releasing early cancels it. A press that lands on a marker is left to
  the marker. A tap on the map closes the card, but **the click the browser sends when a long press
  ends is ignored**, or the card would close the moment it opened; after a touch, the compatibility
  `mousedown` and `click` the browser adds are not taken as a new press either (a window of 1 s after
  `touchend`). The map's `contextmenu` is cancelled, since Android Chrome opens its own menu on a long
  press.
- **The pin card** (`PinPlaceCard`, mounted with a `key` per spot so it asks again for a new one): the
  title "Dropped pin", the coordinates, and **the nearest business** from Photon `/reverse`
  (`fetchNearestCommerce`: within 500 m, the 15 nearest places filtered to the OpenStreetMap keys `shop`,
  `amenity`, `tourism`, `craft` and `office`, the nearest of those, with its distance), "No business
  within 500 m." when there is none, or "Couldn't look up nearby businesses." when the lookup fails. The
  card shows its buttons while that loads. Two buttons: **Ride here**, which starts the [ride to a place](#riding-to-a-place) with the
  same "Dropped pin" `Place` a pasted coordinate gives, and **Save place**.
- **Save place** opens `SavePlaceSheet`, a `FormSheet`: **Name** (required, 100; it starts as the nearest
  business's name when that is within 50 m, so the rider only confirms), **Category** (the icon tiles
  of `CategoryField`, "Other" chosen to start) and **Notes** (optional, 500). `POST /api/places/` with the
  coordinates rounded to 6 decimals, which the server demands. Field errors show under their field.
  On success the sheet and card close, the place is added to the map without another request and a
  toast says "<name> saved".
- **Saved places on the map** are `marker marker-place` buttons (a solid, opaque blue disc, so it is not taken for a green route point) with the icon of their category
  (`icon-fuel` gas station, `icon-utensils` restaurant, `icon-coffee` cafe, `icon-wrench` mechanic,
  `icon-bed` hotel, `icon-tent` camping, `icon-mountain` viewpoint, `icon-parking` rest stop, `icon-star`
  other). Tapping one opens `SavedPlaceCard`: name, category, coordinates, the notes, and **Ride here**.
  `usePlaceMarkers` keeps one marker per place id: a place that is still in the list keeps its marker, so
  panning does not rebuild them.
- **Only the view is fetched** (`usePlaceLocations`): on every `moveend` (and once at the start) the
  hook sends the camera's bounds as `GET /api/places/?bbox=west,south,east,north`, so a place out of
  view is never read, sent or drawn. Mapbox keeps counting longitudes past ±180, so `readViewport`
  wraps them (and clamps the latitudes); a box over the antimeridian goes with `west > east`, and a view
  of the whole world as -180 to 180. A request still in flight is aborted when the camera stops again,
  and **no request is made while the view stays inside the area of the last complete answer**
  (`containsViewport`; an answer of 200 places, the server's limit, may have left some out, so it does not
  count). A failed request is only logged and the places on screen stay; the next move asks again.
- **The camera** (`useSelectionFocus`): selecting a spot, by pressing and holding it or tapping a saved place,
  eases the map to it at a **default zoom of 16** (street level, wherever the rider had zoomed to) so the spot sits in the part the
  card leaves free (260 px of bottom padding). Closing the card gives the room back and keeps the zoom.
- **On the other maps** (`useSavedPlaceMarkers`): the [route creator and editor](#route-creator) and every
  ride map (a [ride to a place](#riding-to-a-place), a route ride and a free ride, see
  [ride.md](ride.md#ride-mode)) also show the saved places in view, so a rider can plan around and ride past
  their favorites. In the **route creator and editor** a saved place is a button: **tapping it adds it as a route
  point**, as picking it in the search would (snapped to the nearest street within 50 m, joined to the previous
  point by a street leg, titled with the place's name; taps are ignored while another point is being routed, and
  a place with no street nearby shows the same "No street here" alert). The tap does not also reach the map, so
  no second point is added. Once it is a point, the numbered point marker sits on top of the place, and tapping that
  removes the point, like any point. On the **ride maps** the places are **landmarks only** (`marker-passive`):
  nothing there takes a tap. A landmark is a `span` inside an empty,
  zero-size `div`, because Mapbox sets `pointer-events` on the element it positions and would undo the
  CSS on the marker itself. These maps keep moving the camera (a rider is followed, so `moveend` fires
  with every fix), so the viewport sent is **grown by half its size on every side** (`expandViewport`,
  `MOVING_MAP_MARGIN_RATIO`): one request covers a while of riding instead of one per fix. The route
  preview maps (static frames) show none.
- **Saved places in the search** (`PlaceSearch`, on the map and in the route creator): the rider's saved places that
  answer the text are the **primary suggestions, listed first**, and everything the services find (Mapbox, Photon,
  Overpass) follows as auxiliary. `useFavoritePlaces` loads all the rider's places (`GET /api/places/all/`,
  [places.md](places.md#api)) each time the field is opened, so one saved a moment ago is there. They are matched **in the
  browser** (`services/savedPlaceSuggestions.ts`) with the same tolerant matching as the other places (case, accents,
  partly typed words, a typing mistake), against the place's name and its kind ("gas station" finds the saved gas
  stations), so they appear at once, before any service answers, and are never dimmed while the rest loads. At most 4
  are listed, best match first, nearest first among equals, and a place the services list again at a saved place's spot
  (same name, within 100 m) is dropped. A saved row (`SavedPlaceResult`, `suggestion-option-saved`) shows its kind's icon at the
  **end of the row** (bare, no disc, in the muted color of the details) and "Saved · Gas station · 350 m". Picking one hands over its name and coordinates like any place: a
  ride to it on the map, a route point in the creator. With nothing typed the list is still the kinds of place, and
  browsing a kind lists that kind's places from the services only. If the saved places cannot be loaded, the error is
  logged and the search answers without them.
- **At most 8 rows** (`MAX_SUGGESTIONS`) are listed while typing, saved places and kinds of place included: the saved
  places first, then the best of the others until the list is full. The list of kinds shown with nothing typed is not a
  completion and keeps all of them.
- Not built: editing or deleting a saved place, and listing them outside the map.

## Riding to a place

The search field of the [route creator](#route-creator) (`PlaceSearch`, same services, same 100 km
ranked list and categories) is also at the top of the map, over the controls, searching near the
rider's street position. Picking a **place** (a category row only lists its places, as there) does not add a point,
and does not start the ride either: it **shows the place on the map first**, like a press and hold or a tap on a
saved place. The camera moves to it, a pin marks it (`usePinMarker`) and its card opens (`useMapPlaces.showPlace`
sets a `found` selection). The card (`views/map/FoundPlaceCard.tsx`) has the name, the address and the
coordinates, **Save place** (opens the [save sheet](#saved-places) with the name filled in) and **Ride here**. A
*saved* place picked in the search opens its saved-place card instead (`PlaceSearch` hands over the
`PlaceLocation` as a second argument), with the ride and delete buttons. **Ride here** opens **ride mode towards
that place** in place of the map (`MapOverview` keeps the picked `Place`; `key` is the place id, so a new pick
restarts the ride).

- **The path is never stored or drawn from a saved route.** `useStreetRoute` asks Mapbox Directions for the
  street route (`fetchStreetRoute`: path, distance and duration) **from the rider's current position to the
  place**, and asks again once the rider has moved 50 m from the spot it was last asked for, so the line follows
  them when they take another street. The previous route stays until the new one arrives; with no street route
  it is empty.
- **The fastest route, traffic included.** The request (`isFastest`) uses the `driving-traffic` profile, whose
  durations include the live traffic, with `alternatives=true`; `fetchStreetRoute` parses every route Mapbox
  returns and keeps the one with the **lowest duration**, so the rider is sent the way that takes the least time
  now, which is not always the shortest. Traffic changes on the way, so the route is also asked again **every
  minute** (`TRAFFIC_REFRESH_MS`) even when the rider has not moved 50 m, and the line switches if a quicker way
  has appeared. The distance and time left shown are those of the chosen route, and the time left therefore
  counts the traffic. The route creator and the way to a route's start keep the plain `driving` profile and one
  route, since a saved route must not depend on today's traffic. The destination is not snapped by the app:
  Directions puts it on the nearest street, so the line ends there.
- **Same screen as [ride mode](ride.md#ride-mode)**: pitched 3D map with buildings that follows the rider and turns
  to their heading (it starts facing the place), the path in the remaining-track color, a checkered finish flag on
  the place, the stats strip, the
  locate button, the screen kept on and the tab bar hidden. It is **solo**: no group and no websocket, and
  no track is recorded; only the [summary](#riding-to-a-place) at the end is saved.
- **Stats** (`RideStatsPanel` with `isToGo`; there are no checkpoints): the strip shows time and speed, and the
  expanded grid **Distance left** and **Time left** (the Directions distance and duration of the current route,
  so exact to the 50 m between requests), **Avg km/h** and **Max km/h**. The average is the kilometres the rider has
  covered over the elapsed time. `useRideDistance` adds up the rider's street-position moves of at least 10 m,
  ignoring smaller ones as GPS noise, so a detour counts and standing still does not. At the place the distance
  and time left read 0.
- **Arrival** (`useDestinationArrival`): within 50 m, in a straight line, of the end of the path (or of the place
  while the path has not loaded) the phone vibrates, the clock, the distance covered and the top speed freeze, and
  `DestinationSummarySheet` opens: the "You've arrived!" modal sheet of [ride mode](ride.md#ride-mode) with the
  place name and four `route-stats` in two rows of two (`route-stats-pair`, as the history does, since four in the usual row of three leave one alone): **Time**, **Distance** (the kilometres covered, which stop counting at the
  arrival, so they fall up to 50 m short of the place), **Avg km/h** and **Max km/h**. **Done** **saves the ride**
  (`POST /api/routes/summaries/destination/`, [routes.md](routes.md#saving-a-ride-to-a-place), by
  `useSaveDestinationSummary`) **and then leaves, back to the map**. While it saves the button shows the loading
  state; if it fails an alert appears and the button reads **Try again**. The X and Esc leave **without saving**.
  The sheet carries no status label: whether the ride was finished is only stored, and shown in the
  [ride history](ride-history.md#rides-to-a-place).
- **Quitting** (the X, **Quit ride**, top right) asks nothing: it ends the ride on the spot, freezing the clock and
  the stats, and opens the same summary as **Ride ended**, and "You stopped before reaching ...". **Done** saves it with `is_finished` false, and the history marks it
  "Not finished". Once the rider has quit, riding up to the place is no arrival.

## Route creator

The **route button** (an icon-only button with the `icon-route` glyph, in the
top right `map-controls` group under the locate button, labeled "Routes") opens
a menu (`views/map/RouteMenu.tsx`) with **Create a new route** and **Preview
routes**. The first swaps the map for `RouteCreatorView`, the second for
`RouteListView` ([route-management.md](route-management.md)). `MapOverview`
holds the mode (`browse`, `create` or `list`), so the creator reuses the street
position already resolved and no second location lookup happens. While the creator is open the
bottom tab bar is hidden (`useHideTabBar`), so the map and the sheet use the
full height and the cancel button is the way out.

| Piece | File | Job |
|-------|------|-----|
| Screen | `views/routes/RouteCreatorView.tsx`, `views/routes/RouteEditor.tsx` | The creator is a thin wrapper; `RouteEditor` is the shared screen (also used to [edit a route](route-management.md#edit)): full-bleed map, cancel and locate controls, bottom sheet with the point list and the save button |
| List | `views/routes/RoutePointList.tsx` | Numbered points, each titled with its place or address (or "Point N" when tapped) and its coordinates, and a remove button; a hint while empty |
| Search | `views/routes/PlaceSearch.tsx`, `views/routes/PlaceSearchInput.tsx`, `views/routes/PlaceSuggestionList.tsx`, `hooks/usePlaceCompletion.ts`, `hooks/usePlaceSuggestions.ts` | The search field over the map: offers matching places and adds the picked one as a point; says when it is searching, found nothing or failed |
| Search services | `services/placeSearchApi.ts`, `services/unnamedPlacesApi.ts`, `services/placeRanking.ts`, `services/placeText.ts`, `services/coordinateQuery.ts`, `services/placeParsing.ts`, `services/placeCategories.ts` | The two-step search, the unnamed places, ranking by relevance then distance, tolerant text matching, coordinates and links, parsing of the answers, and the kinds of place |
| Modal | `views/routes/SaveRouteDialog.tsx` | Name (required, 100) and description (optional, 255), then saves through the `saveRoute` it is given: `POST /api/routes/` here, `PUT` when editing |
| Points | `hooks/useRouteDraft.ts` | The ordered points; snaps each tap to a street, routes each leg, and adds, removes and moves points |
| Sheet | `views/routes/RouteSheet.tsx`, `hooks/useSheetGrab.ts` | The floating sheet and its collapse gesture |
| Reorder | `hooks/useDragReorder.ts` | Press-and-hold drag gesture (and Alt+Arrow keys) for the point list |
| Map | `hooks/useRouteMap.ts` | Map lifecycle, tap and marker-tap handlers, keeps line and markers in sync with the points |
| Layers | `services/routeMapLayers.ts` | The route line (GeoJSON source plus casing and line layer) and the numbered markers |
| Street path | `services/streetRouteApi.ts`, `services/routePath.ts` | Directions request for one leg; joins the legs into the full path |
| API | `services/routesApi.ts`, `services/authorizedRequest.ts` | `createRoute`; calls as the signed-in user, refreshing an expired access token once |
| Toast | `components/feedback/Toast.tsx` | Confirmation after saving, dismissed after 5 seconds |

Behavior:

- Tapping the map adds a point **in tap order**. The tap is snapped with the
  same Directions request as the rider's position (`snapToStreet`, 50 m,
  `driving` profile); the snapped spot, not the tap, becomes the point. With no
  street within 50 m, or a failed request, an error alert appears in the sheet
  and no point is added. Taps while a lookup is running are ignored, so the
  order cannot be scrambled by slow responses; the sheet badge reads
  "Routing…" and Save is disabled meanwhile.
- **Searching a place**: the guide's map search field (`map-search`) sits at the
  top of the map, over the controls. With nothing typed, focusing it offers the
  kinds of place below, so a rider can start without knowing a name. After 2
  characters and a 300 ms pause it asks **two services at once** and merges the
  answers:
  - **Mapbox Geocoding** (v6) for addresses, streets and areas. It handles house
    numbers well ("calle alcala 50").
  - **Photon** (`photon.komoot.io`, OpenStreetMap data) for businesses and
    landmarks: gas stations, malls, restaurants. Mapbox's own search has almost
    no businesses in some countries (in the Dominican Republic it knows one
    Shell, none of Sigma, Next or Petronan), OpenStreetMap does. Roads, towns
    and buildings are dropped from the Photon answer, since the address search
    covers them. If one service fails the other still answers.
  The OpenStreetMap credit is already in the map's attribution.
  Photon is a free public instance: the typed text and the rider's approximate
  position are sent to it. Swap `PHOTON_URL` in `services/placeSearchConfig.ts` for
  a self-hosted Photon (the same API) if its usage limits are ever a problem.
- **Ranked by relevance, then nearest**: both requests carry the rider's position
  (or the route's center when editing, where the rider's position is not known)
  and a bounding box of **100 km** around it, so a namesake in another country
  never shows. The services only lean towards that position, so they are asked
  for as many matches as they give (Photon 50, Mapbox 10; with 10 each, as it
  was, the nearest place was often not among them) and `services/placeRanking.ts`
  orders them. A place is rated by how well it answers the words typed: its
  **name starts with them** ("sigma" for "Sigma Canastica"), its name contains
  them, its name and address together contain them ("sigma 27 de febrero" for
  a Sigma on that avenue), or only some of them (at least half). Better ratings
  go first and **within a rating the nearest goes first**, so the nearest of
  the places that match is on top. **Nothing a service returned is hidden**: it
  may have matched on an alternative name the app cannot see, so a place that
  does not read like the text is only listed last. The same place mapped twice
  (same OpenStreetMap id, or same title within 100 m) is shown once, and the 8
  best are kept. The list is the guide's suggestion list (WAI-ARIA combobox,
  like the username field: arrow keys, Enter picks the active row or the first
  one, Escape closes the list). Each row has the name, and under it the address
  and the distance from the rider.
- **Text variations** (`services/placeText.ts`), like Google Maps takes them:
  - Case, accents and punctuation do not matter ("Av. Prolongación 27" is
    "av prolongacion 27"), nor the order of the words, nor filler words
    ("de", "del", "la"…): "27 febrero" finds "Avenida 27 de Febrero".
  - A word can be partly typed ("prolon" finds "Prolongación") or abbreviated
    ("av" is a start of "avenida"; "c/", "cll", "avda", "ctra", "sto" are
    spelled out).
  - A **typing mistake** is forgiven (one edit in words of 4 to 7 letters, two
    in 8 or more; a swap of two letters counts as one: "sigam" finds "Sigma").
    Numbers never are ("27" is not "26"). Photon itself forgives nothing, so
    when none of its places has all the words, it is asked again with the last
    word shortened by 2 letters ("sigam" as "sig") and the places are ranked
    against what was typed.
  - **Coordinates and Google Maps links** (`services/coordinateQuery.ts`):
    `18.4745, -69.9330` (a comma or a space), `18°28'28.2"N 69°55'58.8"W`, and
    links that carry a spot (`@lat,lng`, `?q=lat,lng`, or the exact pin `!3d…!4d…`
    of a place link). They give one **"Dropped pin"** row with no network call,
    so any spot, mapped or not, can be picked. Short links (`maps.app.goo.gl`)
    cannot be read: the browser cannot follow them.
  - **A kind of place in the text** (`splitCategoryQuery`): "gasolinera sigma",
    "sigma gasolinera", "gas station 27 de febrero", "gasolinera cerca de mi".
    The rest is asked of that kind alone (Photon `osm_tag`; by name, else by
    address among the 50 nearest of the kind, since Photon only matches names),
    and a text that is only the kind lists its nearest places. When that finds
    nothing, the normal search runs.
- **Places OpenStreetMap has no name for** (`services/unnamedPlacesApi.ts`):
  Photon only has named places, and many gas stations are drawn without a name
  (5% of the stations around Santo Domingo, among them one on Avenida 27 de
  Febrero). Overpass, which reads the same data by tag, is asked for them:
  `nwr[amenity=fuel][!name]` within 100 km, and the places that match the text
  complete the list. The row is titled with the company in the `operator`,
  `brand`, `short_name`, `name:es` or `alt_name` tag ("Sigma"), or with what it is
  ("Gas station"), and has the address tags when there are any. Only the kinds
  with an `unnamedTitle` in `placeCategories.ts` do this (gas stations for now).
  Overpass is a free public service that is often slow or down, so it never
  holds anything back: the search **answers in two steps** (`searchPlaces` is an
  async generator) and the list is shown after the first, then updated when
  Overpass answers. The answer is asked once per cell of about 11 km and kept
  5 minutes (a failure 1 minute, so a busy service is not asked at every
  keystroke) and fails silently. When a server times out, the next of
  `OVERPASS_URLS` is asked; a timeout on all of them is logged as a warning, not
  an error (so it does not raise the Next.js dev overlay). Use a self-hosted
  instance if it is ever a problem.
  **A place that nobody has mapped is not found by any of the services**: draw
  it in OpenStreetMap (it shows up in the app within hours to weeks, Overpass
  first), paste its coordinates, or tap the map. Full coverage would need a
  commercial places service; Google Places is not an option on a Mapbox map, as its
  terms require Google's own map.
- **What the list says when it has no rows**: "Searching…" until the first
  answer, "No places found. Try another spelling, or paste the coordinates." when
  nothing matches, and "Couldn't search places. Check your connection and try
  again." when no service answered (focusing the field again asks again). A live
  region says the same aloud. While the next text loads, the answer to the
  earlier one keeps showing.
  - **A category row** ("Gas stations", "Restaurants", "Cafés", "Shopping malls",
    "Supermarkets", "Pharmacies", "Hospitals", "ATMs", "Repair shops", "Hotels")
    appears first when the text starts to name one, in English or Spanish, even
    misspelled (`services/placeCategories.ts`). It does not add anything: it
    fills the field with the category and lists its nearest places (Photon
    `/reverse` with the OpenStreetMap tag, such as `amenity:fuel`, completed
    with the unnamed ones). Typing again goes back to the normal search.
  - **A place row** is added as a point. The camera flies to the place (clear of
    the sheet) and the point is added **as a tapped point would be**: snapped to
    the nearest street within 50 m, with the street leg from the previous point.
    It is titled with the place's name and address ("Next, Avenida Abraham
    Lincoln, Polígono Central, Santo Domingo"). The field then clears, ready for
    the next place. A place with no street within 50 m shows the same "No street
    here" alert as a tap.
  - **A saved place** (from the search, or tapped on the map) is added with its own
    name and category, and its list row and marker show the category's icon in place
    of its number (the first point keeps its number). Other points show their number.
  - **A tapped point** is titled by the address at the spot. The address is looked up
    for every point added, saved place or not (Mapbox reverse geocoding,
    `streetAddressApi.ts`, while the street leg is routed), and kept as its `address`.
    If the lookup fails the point is still added without one, and a tapped one is listed as "Point N".
  - The name, address and category are saved with the route as its
    [waypoints](routes.md#waypoints), so reopening a route to edit shows them again.
  - **Not supported**: crossings of two streets ("Alcalá & Serrano"); neither
    service searches them. Tap the map there.
- Each point after the first also fetches the **street path from the previous
  point** (Mapbox Directions, `driving`, `overview=full`, GeoJSON geometry) and
  keeps it as that point's `path` without the shared first vertex. If Mapbox
  finds no street route to the spot (no route, or a 422), an alert says so and
  the point is not added. The route is therefore never a straight line across
  blocks: every leg follows streets.
- A point is removed with the X in its list row or by tapping its marker
  (marker taps do not add a point). Remaining points are renumbered. Removing
  the last point just drops its leg; removing a middle or first point fetches
  one new leg joining its neighbours (or none, for the first). If that request
  fails the point stays and an alert explains it, so a straight shortcut never
  appears.
- **Collapsing the sheet**: the header is the grab area (there is no handle bar).
  Dragging it down more than 32 px slides the sheet down by the height of its
  body (plus the gap above it), leaving only the header (and an
  error alert, if one is showing) at the bottom edge, so more map shows;
  dragging up slides it back. The change starts as soon as the finger has gone
  far enough, once per press, and animates `transform` for 300 ms. The offset
  comes from a `ResizeObserver` on the body, so it stays right while points are
  added or removed during the collapse. The body is `inert` while collapsed, so
  its hidden buttons cannot be focused. A chevron button in the
  header (`aria-expanded`, turned over while collapsed): a tap or the keyboard does the same. The grab area has
  `touch-action: none` so the drag does not scroll the page; the list below
  keeps its own scrolling. Error alerts stay visible while collapsed, because a
  tap on the map can still fail with a message. The state is local to the sheet
  and resets with the creator.
- **Reordering**: press and hold a row for 400 ms (the phone vibrates briefly),
  then move up or down; the row follows the finger and the others slide to
  open the gap, and the list autoscrolls near its top and bottom edges. A
  shorter press, or a finger that moves before the hold ends, is left to the
  browser so the list still scrolls. The remove button is not part of the
  gesture. Dropping on a new position calls `movePoint`, which re-fetches only
  the legs whose previous point changed (a point that keeps its predecessor
  keeps its leg), in parallel, and renumbers markers and rows. If any new leg
  has no street route, the old order is kept and an alert explains it. The
  drop is not optimistic: the row returns to its slot while the legs load
  ("Routing…"), then the list updates, so the map line is never out of step
  with the order. Keyboard users focus a row and press Alt+ArrowUp or
  Alt+ArrowDown.
- Markers are the guide's `marker` buttons, numbered, the first one
  `marker-start`. The line is the joined street path, drawn with the guide's
  route colors (`--color-primary` over a `--color-surface` casing, resolved
  from the tokens, 7 and 11 px like `.map-route`). Layers are
  re-added on every `style.load`, because switching between the light and
  dark style drops custom layers.
- **Save route** is disabled until there are 2 points and no leg is being
  fetched. It sends the whole street path as `points`, plus the points
  as `waypoints`, each with its name, address and category (so the route can be edited later), so the server's distance
  follows the roads (see
  [routes.md](routes.md#points)). It opens the modal: a native `<dialog>` opened with `showModal()`,
  styled as the guide's bottom sheet (`sheet sheet-modal`), so Esc, focus
  trapping and the backdrop are the browser's. The guide reserves the centered
  `dialog` for confirmations, hence the sheet.
- On success the creator closes and the map shows a toast with the saved
  name, the server's distance and the estimated time. On failure the modal
  stays open with the server's field errors or a form-level alert, and the
  drawn points are kept. The cancel button discards the draft without
  asking: nothing is stored until save.
- The access token is the 15-minute JWT; `requestJsonAuthorized` renews it
  once with the refresh token on a `401`. If the refresh is also rejected the
  tokens are cleared and the modal shows "Your session has expired", and the
  next reload lands on the login screen. `AuthProvider` is not told, so the
  screen itself does not redirect.

## Configuration

`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` must hold a Mapbox **public** token
(`pk.…`). Locally, copy [.env.example](../../frontend/.env.example) to
`frontend/.env.local` (git-ignored) and fill it in.

On Railway the variable is declared on the `frontend` service in
[railway.ts](../../.railway/railway.ts) as `preserve()`: the token is not in
the repo, and `make railway_apply` keeps whatever value the service already
holds instead of deleting it. Set the value once in the Railway dashboard
(`frontend` → Variables) and redeploy: Next inlines `NEXT_PUBLIC_*` at build
time, so changing it needs a new build. Restrict the token to the app's URL in
the Mapbox dashboard, since it is visible to the browser.

## Key decisions

- **Directions API for snapping**: it accepts a public token and a single
  point (as a repeated waypoint), unlike Map Matching, which needs a trace.
  The `driving` profile is the definition of "street"; change
  `STREET_PROFILE` to allow cycleways or footpaths.

- **Repainting the style's colors over a custom style**: a custom style would
  need a Mapbox Studio account and would not follow the theme tokens. A CSS
  filter on the canvas would also tint the route lines, since they are drawn in
  the same canvas, so the stock style's own paint colors are replaced with the
  style guide's map tokens instead.
- **No `react-map-gl`**: one map, one marker; the imperative API is a few
  lines and avoids another dependency.
- **Service worker untouched**: tiles and the style come from Mapbox origins,
  and the worker ignores cross-origin requests, so no map data is cached or
  broken offline; the map simply does not load without a connection.
- **Location permission is requested on opening the tab**, not at login, so
  the prompt appears when its purpose is obvious.
