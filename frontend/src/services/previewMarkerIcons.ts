/**
 * The marker glyphs of the route preview image, as white SVG: the same drawings as the `icon-*` classes
 * of the style guide (icons.css), which the image renderer cannot use because it has no CSS.
 */
const MARKER_ICON_SVGS: Readonly<Record<string, string>> = {
  'icon-flag': "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.33 2a6 6 0 0 0 3.6-1.2A1 1 0 0 1 20 3v10a1 1 0 0 1-.4.8 6 6 0 0 1-3.6 1.2c-2.33 0-4.33-2-7.33-2A6 6 0 0 0 4.4 14'/></svg>",
  'icon-flag-checkered': "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M4 22V3'/><path d='M4 3h16v12H4'/><path d='M8 3h4v4H8zM16 3h4v4h-4zM4 7h4v4H4zM12 7h4v4h-4zM8 11h4v4H8zM16 11h4v4h-4z' fill='white' stroke='none'/></svg>",
  'icon-fuel': "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M3 22h12'/><path d='M4 9h10'/><path d='M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18'/><path d='M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5'/></svg>",
  'icon-utensils': "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2'/><path d='M7 2v20'/><path d='M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7'/></svg>",
  'icon-coffee': "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M10 2v2M14 2v2M6 2v2'/><path d='M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1'/></svg>",
  'icon-wrench': "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'/></svg>",
  'icon-bed': "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9'/></svg>",
  'icon-tent': "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M3.5 21 14 3M20.5 21 10 3M15.5 21 12 15l-3.5 6M2 21h20'/></svg>",
  'icon-mountain': "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m8 3 4 8 5-5 5 15H2L8 3z'/></svg>",
  'icon-parking': "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='18' height='18' x='3' y='3' rx='2'/><path d='M9 17V7h4a3 3 0 0 1 0 6H9'/></svg>",
  'icon-star': "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'/></svg>",
}

/** The `src` of an `<img>` that draws the glyph of an `icon-*` class; undefined for a class with no glyph. */
export const getMarkerIconSrc = (iconClass: string): string | undefined => {
  const svg = MARKER_ICON_SVGS[iconClass]
  return svg && `data:image/svg+xml,${encodeURIComponent(svg)}`
}
