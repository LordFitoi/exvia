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
| `forms.html` | Fields, select and dropdown, form sections, disclosure, step indicator |
| `content.html` | Feedback and states, lists, avatars, cards, app bar, tabs, tab bar, bottom sheet, modal sheet form, dialog |
| `patterns.html` | Full mobile screens in phone frames: sign in, home feed, map, route creator, ride mode, ride summary, profile |
| `exvia-ui.css` | Product design system entry point; only `@import`s the files below |
| `fonts.css`, `fonts/` | `@font-face` for Public Sans and Barlow, vendored latin subsets with their OFL licenses |
| `tokens.css` | Design tokens (`:root` custom properties) |
| `base.css` | Reset, element defaults, typography, layout helpers, 44px hit-area rule |
| `icons.css` | Icon set as CSS masks |
| `buttons.css`, `inputs.css`, `controls.css` | Buttons; text fields, select, dropdown; checkbox, radio, switch, slider |
| `surfaces.css`, `feedback.css` | Cards, lists, avatars, labels, chips; alerts, toast, progress, skeleton, state views |
| `motion.css` | Shared keyframes (`fade-in`, `screen-in`, `tab-pop`) and the transitions that give taps and new content feedback |
| `navigation.css`, `overlays.css`, `sections.css` | Bars, tabs, segmented control; sheet and dialog; form sections, disclosure, stepper, list footer |
| `map.css`, `profile.css`, `clan.css` | Domain components (map overlays and markers, profile, ride and notice cards) |
| `styleguide.css`, `specimens.css`, `devices.css` | Chrome of the guide pages only (header, specimen boxes, swatches, shadow boxes, 393pt phone frames). Not for the product |
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
- **Modal sheet for short forms.** A form that needs full attention, such as
  naming a route, uses `<dialog class="sheet sheet-modal">` opened with
  `showModal()`: a bottom sheet over a scrim, with the native dialog's focus
  trap and Esc. The centered `dialog` stays for confirmations only; it sets
  `margin: auto` itself because the Tailwind preflight zeroes the native
  centering margin, and keeps a `--space-4` gap from the screen edges.
- **Center action in the tab bar.** `tab-bar-action` raises one destination
  (Ride) as a round, filled primary button 1.5rem above the bar, with its label
  level with the others. Only one per bar: Von Restorff only works if it is
  the single filled shape. It stays a link in the same `<nav>`.
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
  tall) instead of pushing the page.
- **Collapsible sheet.** `sheet-grab` (handle and header) slides the sheet
  down by the height of `sheet-body` when dragged down and back when dragged
  up, so the content behind a sheet can be seen. The offset is an inline
  `transform`, which keeps the animation to `transform` only. The handle is a `button` with
  `aria-expanded`, which covers taps and keyboards; its 44px hit area comes
  from the shared pseudo-element rule in `base.css`.
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
