# UI/UX Style Guide

Static, dependency-free style guide for the Exvia web app: a mobile-first PWA
for riders (clans, rides, maps, profile). Its visual language is the
[Minimals](https://minimals.cc) design system; its behavior follows the UX
laws in [ux-laws.md](../base/ux-laws.md) and the component map in
[ux-code-pattern.md](../base/ux-code-pattern.md). It lives in
[docs/ui-ux/](../ui-ux/) and is the reference for all frontend UI work. Open
[index.html](../ui-ux/index.html) directly in a browser; there is no build
step and no network access is needed. `make open_styleguide` opens it with
the first opener found: `wslview`, `explorer.exe` (WSL), `xdg-open` (Linux)
or `open` (macOS).

## Layout

| File | Role |
|------|------|
| `index.html` | Overview: principles, UX laws by component, layout and PWA rules |
| `foundations.html` | Color palettes and roles, type scale, spacing, radius, elevation, icons |
| `components.html` | Controls: buttons, checkbox, radio, switch, slider, segmented control, chips |
| `forms.html` | Fields, select, dropdown and suggestions, form sections, disclosure, step indicator |
| `content.html` | Feedback and states, lists, avatars, cards, app bar, tabs, tab bar, floating sheet, modal sheet form, dialog |
| `patterns.html` | Full mobile screens in phone frames: sign in, home feed, map, route creator, ride mode, ride summary, profile |
| `group.html` | Group rides: ride setup (route and invitations), free mode, the choose-a-route sheet, the group map with rider bubbles, Home notifications, the Riding now row and the join-back dialog |
| `exvia-ui.css` | Product design system entry point; only `@import`s the files below |
| `fonts.css`, `fonts/` | `@font-face` for Public Sans and Barlow, vendored latin subsets with their OFL licenses |
| `tokens.css` | Design tokens (`:root` custom properties) |
| `base.css` | Reset, element defaults, typography, layout helpers, 44px hit-area rule |
| `icons.css` | Icon set as CSS masks |
| `buttons.css`, `inputs.css`, `controls.css` | Buttons; text fields, select, dropdown; checkbox, radio, switch, slider |
| `surfaces.css`, `feedback.css` | Cards, lists, avatars, labels, chips; alerts, toast, progress, skeleton, state views |
| `motion.css` | Shared keyframes (`fade-in`, `screen-in`, `tab-pop`) and the transitions that give taps and new content feedback |
| `navigation.css`, `overlays.css`, `sections.css` | Bars, tabs, segmented control; sheet and dialog; form sections, disclosure, stepper, list footer |
| `map.css`, `profile.css`, `clan.css` | Domain components (map overlays and markers, including `rider-marker`; profile; ride and notice cards) |
| `styleguide.css`, `specimens.css`, `devices.css` | Chrome of the guide pages only (header, specimen boxes, swatches, shadow boxes, 393pt phone frames, `phone-footer` and `phone-sheet` for a pinned action and a sheet over a non-map screen). Not for the product |
| `theme.js`, `slider.js` | Guide only: cycles system, light and dark theme; keeps the slider fill in sync (demo of the `--value` contract) |

## Where the design comes from

Token values mirror the Minimals theme as served by minimals.cc: the palettes
(primary green `#00A76F`, secondary, info, success, warning, error, each with
lighter, light, main, dark and darker shades, plus the grey scale), the type
scale (Public Sans for text, Barlow 700 and 800 for h1 to h3), the 8px base
radius (16px for cards), the layered shadows (`z1` to `z24`, card, dropdown,
dialog, colored) and the tint scale (hover 8%, soft 16%, outline 48%). The CSS
is written for Exvia; no Minimals source code or assets are copied. Minimals
is a commercial template (its free kit is MIT), so reusing its own components
or assets needs its license. Public Sans and Barlow are SIL OFL fonts
(`docs/ui-ux/fonts/OFL-*.txt`).

Exvia changes the following on purpose:

- **Labels sit above fields** (Jakob's Law), not inside as floating labels.
- **48px default buttons** (Minimals ships 36px) and a 44px hit area for
  anything smaller (Fitts's Law). Fields are 56px like Minimals.
- **Mobile structure.** Bottom tab bar, bottom sheets, safe areas and a
  30rem column. Minimals is a desktop admin template and has none of these.
- **No `transition: all` and no hover lift.** [css.md](../base/css.md) only
  allows `transform` and `opacity` to animate, so hover and focus changes are
  instant tone or shadow changes, and the switch fades an overlay instead of
  animating its background. The skeleton pulses (opacity) instead of the
  `wave` gradient sweep Minimals uses by default.
- **Slider and checkbox are custom CSS**, not Material components.
- **`--color-*-text` roles.** Text uses the dark shade on light (darker for
  success and warning, whose dark shade is only 3.7:1 on its soft tint) and
  the light shade on dark, so labels, links and icons stay above 4.5:1.

## Key decisions

- **Tokens are the source of truth.** Colors, spacing, radius, type, shadow,
  motion and layout sizes are custom properties in `tokens.css`. Components
  never use raw values for these.
- **Light and dark with `light-dark()`.** Every color token is one
  `light-dark(light, dark)` pair, so there is a single definition per token
  and the theme follows `prefers-color-scheme`. `data-theme="light|dark"` on
  `<html>` overrides it through `color-scheme`; `theme.js` only drives that
  attribute for the guide.
- **Soft variants via `color-mix()`.** `--color-*-soft`, hover and outline
  tints are derived from the base color at the `--tint-*` percentages.
- **Neutral ink, one green.** The default button is the Minimals "inherit"
  button (ink, white in dark mode). Primary green marks one key action per
  screen, the current tab, links and selected controls. White on main primary
  is 3.1:1 (3.2:1 on error), as in Minimals; set `--color-on-primary` to
  `--color-grey-800` (5:1) if AA is required.
- **Tone and variant combine.** `button-primary` or `button-error` sets
  `--tone*` custom properties; `button-soft`, `button-outline` and
  `button-text` change the fill. One rule per variant covers every tone.
- **Mobile first.** Base styles target a phone; `min-width` queries
  (`48rem`, `72rem`) only enhance. The app column is capped at
  `--app-max-width` (30rem), so type sizes do not scale with the viewport.
- **PWA concerns.** Safe-area insets (`--safe-top`, `--safe-bottom`) are
  applied on bars and the sheet; the pages set `viewport-fit=cover` and a
  `theme-color` per color scheme; overscroll bounce is disabled on `body`.
- **Native controls first.** `select` uses the OS picker; the custom
  dropdown and disclosure are `<details>` elements (no JS); checkbox, radio,
  switch and slider are restyled native inputs so keyboard and screen readers
  keep working. State is expressed with ARIA attributes (`aria-pressed`,
  `aria-selected`, `aria-current`, `aria-invalid`), not state classes.
- **Slider fill.** The rail is filled up to `--value` (a percentage). In the
  product, set it from the controlled value; `slider.js` does it for the demo.
  Progress bars take `--progress` (0 to 1) the same way, as an inline custom
  property, which is the one allowed inline style.
- **Icons as CSS masks with inline data URIs.** They inherit `currentColor`
  and need no extra requests. External SVG files were rejected because
  browsers block `mask-image` and `<use>` references from `file://`, which
  would break opening the guide locally.
- **Fonts are vendored, latin subset only.** About 70 KB in total, so the
  guide works offline and from `file://`. In the Next.js app use `next/font`
  with the same two families.
- **Motion.** Only `transform` and `opacity` animate. Durations are tokens
  (150, 200 and 300ms) that collapse to ~0 under `prefers-reduced-motion`.
  `motion.css` holds the shared pieces: screens fade in and rise 12px on
  mount (`screen-in`), full-bleed screens such as the map only fade, tab bar
  items dim while pressed and the active tab's icon settles with `tab-pop`,
  and alerts, new list rows and the modal backdrop fade in. Entrances
  only: nothing animates out, because an exit needs the element to stay
  mounted.
- **Floating sheet.** Every sheet is the dialog's card moved to the thumb:
  pinned to the bottom but never touching the screen edges, with a `--space-4`
  gap on both sides and below (lifted by the safe area), all four corners
  rounded with `--radius-lg`, the dialog's solid surface and `--shadow-dialog`,
  and no handle bar. The header (`sheet-header`: title left, X or actions
  right) sits in `sheet-grab`, the drag area. The centered `dialog` stays for
  confirmations only; it sets `margin: auto` itself because the Tailwind
  preflight zeroes the native centering margin, and keeps the same gap from
  the screen edges.
- **Modal sheet.** A flow that needs full attention, such as naming a route
  or picking a route, uses `<dialog class="sheet sheet-modal">` opened with
  `showModal()`, over the scrim, with the native dialog's focus trap and Esc.
  Dragging the header down slides the card away and closes it; letting go
  early springs it back. The drag is an inline `transform` (only transform
  animates) and the card carries `data-dragging` while the finger is down so
  the spring does not fight it. The X stays as the visible way out, since a
  drag is pointer-only. The card's bottom edge is the bottom of the app's
  `100dvh` box (`inset: 100dvh 0 auto` and `translate`), the edge the tab bar
  and the ride strip sit on, not `bottom: 0` of the window, which on Android
  reaches behind the system navigation bar. The same classes on a `div` draw
  the card in the guide's mockups. In the app, `SheetHeader` and
  `useSheetDragClose` implement the drag: past 96px it closes, otherwise it
  springs back. A sheet without `sheet-modal` is a plain
  card over a map, with no scrim.
- **One meaning per icon.** The X only closes or leaves a screen. Removing a
  row from a list, such as a rider, uses the trash icon, so the row's button
  and the dialog's X cannot be mistaken for each other.
- **Selectable row with actions.** `list-item-split` holds a `list-item-main`
  button (avatar and text, `aria-pressed`) and, after it, the row's own
  buttons. Tapping the row selects it (primary tint and title) and only then
  shows its more-options button (`icon-more`), which opens a `menu` whose
  destructive item is `menu-item-danger` (error color). A delete is therefore
  never one tap from the list, and the more-options button appears only where
  it can act. Rows the person cannot act on stay plain `list-item`s.
- **Flat list.** `list list-flat` drops the card (shadow, background, rounded
  corners) and the rows' side padding and keeps only the dashed dividers, for a
  list inside a dialog or sheet, which is already a card (the Riders dialog).
- **A menu is never cut off.** A `menu-panel` inside a box that scrolls or clips
  (the Riders dialog) would be cut by its overflow. With `popover="manual"` the
  panel goes to the top layer, where no overflow, transform or blur of an
  ancestor can clip or move it (`menu-panel[popover]`: fixed, with `top` and
  `left` set from the button's rectangle). `useMenuPopover({ isInTopLayer: true })`
  and `placeMenuPanel` do it: below the button with the right edges aligned,
  flipped above when there is no room, kept 8px inside the screen, and closed on
  scroll and resize because it would no longer sit next to its button. Menus in
  plain flow, like the map controls, keep the absolute panel.
- **Confirm with a primary button.** The confirm dialog's second button is the
  error color only when the action is destructive (Delete, Remove). An action
  that is serious but not destructive, such as handing the lead of a ride to
  another rider, confirms with the primary button (`ConfirmDialog`,
  `isDestructive={false}`).
- **Screen overlay.** `screen-overlay` shows a full screen (the route creator)
  over another one without leaving it, so what runs under it (a ride sharing
  its position) keeps running. It is fixed over the window at `--z-sheet`, with
  the page background, and holds the screen in the app's column. Render it into
  the body (a portal): an ancestor with a blur or a transform, like the map
  controls, would make `fixed` relative to itself.
- **Panel dialog.** A list to choose from, or a short form that is chosen from
  and then left (the riders of a ride, the route to ride, the username of a rider to invite), is a centered
  `dialog dialog-panel` instead of a sheet: the confirmation dialog's card with
  the sheet's header (`sheet-header`: title left, X right) and its content
  under it. It is as wide as the app column minus the `--space-4` gap on each
  side, scrolls inside itself above 80dvh, and closes with the X or Esc (no
  drag). In the app, `FormSheet` takes `isCentered` and `RidersDialog` uses the
  same classes; both use `ModalHeader`. Sheets stay for flows that start from
  the thumb (naming a route, the ride summary, notifications).
- **Center action in the tab bar.** `tab-bar-action` raises one destination
  (Ride) as a round, filled primary button 1.5rem above the bar, with its label
  level with the others. Only one per bar: Von Restorff only works if it is
  the single filled shape. It stays a link in the same `<nav>`.
- **Suggestions.** A field whose answer is a name the person types, such as the
  username of a rider to invite, completes it: `suggestions` wraps the input and
  a `suggestion-list` of `suggestion-option`s (avatar and name, 44px tall) that
  opens under it once something is typed and only while there are matches. It is
  the WAI-ARIA combobox with a list: the input is `role="combobox"` with
  `aria-expanded`, `aria-controls` and `aria-activedescendant`, the list a
  `listbox` and the active option `aria-selected`. The focus never leaves the
  input: the arrow keys move the active option, Enter picks it (and only then
  does not send the form), Escape closes the list and not the dialog around it,
  and pressing an option does not blur the input. Typing a whole name without
  picking stays valid. In a dialog the list is `popover="manual"` (top layer,
  `suggestion-list[popover]`): the app sets `top`, `left` and `width` from the
  input's rectangle, below it or flipped above when there is more room there, and
  `max-height` from the part of the screen the phone keyboard leaves free
  (`visualViewport`, since the keyboard covers the page without resizing it). The
  list shows the options that fit and **scrolls inside itself**
  (`overflow-y: auto`, `overscroll-behavior: contain`); while it is open the page
  under it cannot be scrolled or panned (`touchmove` outside the list is
  prevented). It follows the input when the window or the visual viewport resizes
  or scrolls (the keyboard opening or closing) and closes when anything else
  scrolls, like the action menu's panel.
- **Action menu.** `menu` and `menu-panel` give an icon button a small popover
  of actions (`menuitem`s), aligned to the button's right edge so it opens
  inward. It follows the WAI-ARIA menu button pattern: `aria-haspopup`,
  `aria-expanded`, Escape and arrow keys. The panel is opaque because a
  blurred panel inside the blurred map controls cannot blur what is behind it.
  `button-row` places related actions side by side: destructive soft and first,
  primary last and wide. The delete confirmation is the guide's `dialog` with
  the solid error button, the one place it is allowed.
- **Screen header.** `screen-header` puts a screen's title on the left and its
  close action on the right, for full-height screens that hide the tab bar
  (the Ride picker; the map screens put the close in `map-controls`); it keeps a way out visible.
- **Selectable list row.** `button.list-item` with `aria-pressed="true"` gets a
  primary tint, a primary title and a check icon, so the choice is not color
  alone. `route-preview` is a rounded map frame for a screen (not full-bleed);
  `route-preview-fill` makes it take the free height of its column instead of
  a fixed one, for screens that pin their action to the bottom edge. A long
  list scrolls inside its container (`route-choice-list`, exactly four rows
  tall) instead of pushing the page; it scrolls vertically only,
  and long row titles wrap anywhere so a name without spaces cannot widen the row.
- **Group ride pieces** (`group.html`). The setup screen reuses what exists: a
  `section-heading` (title left, a `button.link-action` right, such as **Change** and **Add**),
  grouped `list` rows, and `list-item-icon-primary` with `icon-navigation` for **Free mode**,
  so it reads as a route row that is plainly not a route. New: `rider-marker` (another rider on
  the map: a bubble with their picture or initials above a dot at their position, zero-size so
  it sits on the point, `pointer-events: none`, in primary green so it differs from the ink
  "You" dot); `icon-button-badged` (a count on an icon button's corner, the aria-label carrying
  it too); `list-item-stacked` (a row whose answer buttons wrap under its text, for a
  notification whose title needs the width); `.avatar > img` (a picture fills the disc);
  `button.link-action` (the link without the button box); and `section-heading` also styles
  an `h2`.
- **Collapsible sheet.** Dragging the `sheet-grab` header down slides the
  sheet down by the height of `sheet-body`, and dragging up brings it back, so
  the content behind a sheet can be seen. The offset is an inline `transform`,
  which keeps the animation to `transform` only. With no handle bar, a
  chevron `icon-button` in the header (`sheet-header-end`, beside any badge)
  carries `aria-expanded` and covers taps and keyboards; the body is `inert`
  while collapsed.
- **Press-and-hold reorder.** `route-point` rows can be dragged after a
  400 ms hold (`useDragReorder` in the frontend): the hold keeps normal
  scrolling working, the dragged row floats with `--shadow-z16` and its
  neighbours slide by one row, animating only `transform`. Alt+ArrowUp and
  Alt+ArrowDown move a focused row, since a drag is pointer-only.
- **Map tiles are a stand-in.** `patterns.html` draws the map as inline SVG.
  When a real map library is added, keep the overlay components
  (`map-overlay`, `map-controls`, `marker*`, `sheet`) and replace only the
  canvas. Markers are `<button>`s with an `aria-label`.
- **Files stay under 300 lines.** The guide is split into several pages and
  CSS files by responsibility to respect [core.md](../base/core.md).

## UX laws applied

| Law | What the guide does | Where |
|-----|---------------------|-------|
| Fitts | 48px default button at 120px minimum width; every control has a 44px hit area (`base.css` grows small buttons, chips, segments, links, markers); the slider is a 44px band; destructive actions are soft and sit apart from the primary (solid error only inside the confirm dialog) | `buttons.css`, `base.css`, `controls.css` |
| Doherty | Transitions 150 to 300ms; skeletons shaped like the content; loading button keeps its width; toast in 200ms | `tokens.css`, `feedback.css` |
| Proximity | 8px inside a group, 16px between siblings, 24px between related blocks, 32px between groups (`stack`, `stack-sm`, `stack-lg`, `stack-xl`) | `base.css`, `patterns.html` |
| Chunking, Cognitive Load, Tesler | Fieldsets with legends; advanced options in a disclosure; switches default to the safe choice | `sections.css`, `forms.html` |
| Hick, Miller | 3 to 5 tab bar items, 2 to 4 segments, at most 5 chips, 7 menu options | `index.html`, `navigation.css` |
| Goal-Gradient, Zeigarnik | Stepper with count and time left; profile completion bar with what is missing; `Draft` label | `sections.css`, `patterns.html` |
| Peak-End | Empty, success and error views share one layout and end in one action | `feedback.css` (`state-view`) |
| Von Restorff, Occam, Selective Attention | One filled button per screen; muted secondary text; red only for errors and medical info; month labels are muted | `buttons.css`, `clan.css` |
| Jakob, Serial Position, Mental Model | Labels above fields; Home first and Profile last in the tab bar; conventional icons; "One-off" rather than "Unique" | `inputs.css`, `navigation.css` |
| Postel, Parkinson | Lenient input types and hints; bounded text areas (`maxlength`, max height) | `inputs.css`, `forms.html` |
| Flow, Working Memory | Sheets for secondary flows with a visible close; dialogs only confirm destructive actions; back button shows the previous title | `overlays.css`, `content.html` |
| Common Region, Similarity | Every card shares the 16px radius and shadow; every label shares the 6px radius | `surfaces.css` |

Not built yet: Jakob's Law asks for a side or top navigation on desktop. The
tab bar must move to a left rail from `72rem`; there is no desktop shell yet.

## Using it in the Next.js frontend

The frontend ([frontend-screens.md](frontend-screens.md)) uses the guide's CSS
as is: the product files (`exvia-ui.css` and everything it imports, plus the
fonts) are copied to `frontend/src/styles/exvia-ui/` and the React components
use the documented class names. Re-copy them when `docs/ui-ux/` changes. The
guide pages themselves (`styleguide.css`, `specimens.css`, `devices.css`,
`theme.js`) are not part of the product.

Porting the tokens to a Tailwind `@theme` instead (token names follow
Minimals: `primary`, `secondary`, `info`, `success`, `warning`, `error`,
`grey`) is still possible, but nothing needs it yet.

**No scrollbars.** `base.css` hides every scrollbar in the app (`scrollbar-width: none` and
`::-webkit-scrollbar`); scrolling still works by touch, wheel and keyboard.
