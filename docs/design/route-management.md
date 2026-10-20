# Route management

Previewing, editing and deleting the routes a user has saved, from the Map tab.
Creating a route is in [map.md](map.md#route-creator), riding one in
[ride.md](ride.md), the API in [routes.md](routes.md).

## Entry: the route menu

The route button of the map controls (top right, under the locate button) opens
a menu with three items: **Create a new route** (`RouteCreatorView`),
**Preview routes** (`RouteListView`) and **Ride history** ([ride-history.md](ride-history.md)).
`views/map/RouteMenu.tsx` implements the
WAI-ARIA menu button pattern: the button has `aria-haspopup="menu"` and
`aria-expanded`; opening moves focus to the first item; Escape closes it and
returns focus to the button; ArrowUp and ArrowDown move between items; a press
outside closes it; choosing an item closes it and acts. The panel is the guide's
`menu-panel`, opaque.

`MapOverview` keeps a mode, `browse`, `create`, `list` or `history`. Location is only
needed for the first two; the list and the history do not use it.

## Route list

`views/routes/RouteListView.tsx`. It looks like the [Ride picker](ride.md) with
three differences: the map preview is **small** (a fixed-height `route-preview`,
not the free height of the screen), the list **fills** the rest of the column
and scrolls, and the actions at the bottom are **Delete**, **Share** and **Edit** instead
of Ride.

- Top to bottom: the "Routes" header with an X (back to the map), the preview,
  the list, and the actions in two lines: **Delete** and **Share** half and half
  (`button-row-even`, both soft), then **Edit** full width below them, the
  primary action last and under the thumb. Three on one line were too tight on a
  phone (`button-group` keeps the same 12px gap between the lines). The tab bar is hidden (`useHideTabBar`).
- Selecting a row fetches that route's path and frames it on the preview, as in
  the picker. **Edit** is enabled once the selected route has loaded; **Delete**
  and **Share** as soon as one is selected. None is enabled with no selection.
  There is no Ride button.
- With no routes, the empty state offers **Create a route**, which switches to
  the creator.
- `RoutePreview` and `RouteChoiceList` are shared with the picker
  (`components/route/`).

## Share

**Share** copies the route's public link,
`<origin>/routes/<uuid>/` ([route-sharing.md](route-sharing.md)), to the
clipboard (`navigator.clipboard`, through `useShareRoute`) and confirms it with
a **toast**: "Link copied to the clipboard", at the top of the screen, which
dismisses itself after 5 seconds. The toast is the shared `Toast` inside a
`.toast-region`, the guide's floating container for screens that have no overlay
of their own (the map has `.map-overlay`); it passes taps through, so it never
blocks the list. If the clipboard refuses (the browser needs https or
localhost, and may ask for permission), the error alert above the buttons says
so. The outcome belongs to the route it was set for, so selecting another row
clears it. Share needs only the selection, not the loaded path: the link only
needs the id. It copies rather than opening the device's share sheet, so the
behaviour is the same on every device. The `share` icon and the `.toast-region`
were added to the guide for it.

## Delete

**Delete** opens the guide's confirm dialog (`components/feedback/ConfirmDialog`, shared with the [ride history](ride-history.md#delete): a native
`<dialog class="dialog" role="alertdialog">`, "Delete this route?", the route
name, Cancel first and the solid error Delete last). It is the one place the
guide allows a solid error button.

`useRouteDeletion` (a wrapper over `useConfirmedDeletion`, which the ride history shares) runs the two steps. Cancel (or Escape) closes it and keeps
the route. Confirming calls `DELETE /api/routes/<uuid>/`; while it runs both
buttons are disabled and Delete shows the loading state. On success the dialog
closes, the selection is cleared (so the preview goes back to "Select a route")
and the list reloads. On failure the dialog stays open with the error under the
text, and the buttons are enabled again.

## Edit

`RouteEditView` opens from **Edit** in place of the list; Cancel (the X) returns
to the list with the same route still selected. It is the route creator on an
existing route: the shared `RouteEditor` screen with different inputs.

| Input | Create | Edit |
|-------|--------|------|
| Camera starts at | The rider | The route, framed above the sheet |
| "You" marker | Yes | No |
| Initial points | None | The route's waypoints |
| Sheet and save button | "New route", "Save route" | "Edit route", "Save changes" |
| Save | `POST` | `PUT` of the whole route |
| Name and description | Empty | Filled in |

- **Opening**: the waypoints are re-routed leg by leg, in parallel, through
  Mapbox (`useInitialDraftPoints`, `services/draftPoints.ts`), because the
  stored `points` are the street path and the editor works on the chosen points.
  Meanwhile a screen says "Opening route"; if any leg has no street route it
  says "Could not open this route" with Try again. The tab bar stays hidden
  throughout: the edit view holds it hidden while it loads and the editor holds
  it once open, and the list view lets go while the editor is showing
  ([frontend-screens.md](frontend-screens.md)).
- **Editing** is the creator: tap the map to add a point, X on a row or marker
  to remove one, hold a row to reorder, collapse the sheet.
- **Saving** opens the same modal sheet as the creator, titled "Save changes",
  with the current name and description filled in. It sends the new street
  `points`, the `waypoints`, the name and the description. The server
  recalculates the distance and time. Back in the list, the list and the
  selected route are reloaded, so the new name and length show.
- **Routes without waypoints**, saved before they were stored, open with only
  their start and finish as points. Re-routing between them can differ from the
  saved path; the rider adds the points in between again and saves.

## Key decisions

- **Waypoints are stored**: see [routes.md](routes.md#waypoints). Without them an
  edit cannot show the points the rider chose.
- **One editor, two thin wrappers**: `RouteCreatorView` and `RouteEditView` only
  choose the inputs; the screen, the draft and the map hooks are shared.
- **The list view owns the edit state**: its list and selection survive an edit
  because `RouteListView` stays mounted and only swaps what it renders.
- **Delete asks every time**: there is no undo, and the route id is not
  recoverable.
- **No toast after edit or delete**: the list changing (new name, row gone,
  preview cleared) is the confirmation. Share is the exception: copying changes
  nothing on screen, so it needs a toast.
