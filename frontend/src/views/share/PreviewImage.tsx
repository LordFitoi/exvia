import { buildPreviewMarkers } from '@/services/previewMarkers'
import type { PreviewMarker } from '@/services/previewMarkers'
import type { MapSize, MapView } from '@/services/staticMapView'
import type { Coordinates } from '@/types/geolocation'
import type { Waypoint } from '@/types/route'

// The image renderer has no stylesheet: it lays out flexbox and reads inline styles only.
const MARKER_SIZE_PX = 44
const MARKER_BORDER_PX = 3
const MARKER_BORDER_COLOR = '#ffffff'
const ICON_SIZE_PX = 22
const LABEL_FONT_SIZE_PX = 22
const LABEL_FONT_WEIGHT = 700

interface PreviewImageProps {
  /** The `src` of the map, with the route line already drawn on it. */
  mapSrc: string
  path: readonly Coordinates[]
  waypoints: readonly Waypoint[]
  view: MapView
  size: MapSize
}

function MarkerDisc({ marker }: { marker: PreviewMarker }) {
  const { x, y, background, iconSrc, label } = marker
  return (
    <div
      style={{
        position: 'absolute',
        left: x - MARKER_SIZE_PX / 2,
        top: y - MARKER_SIZE_PX / 2,
        width: MARKER_SIZE_PX,
        height: MARKER_SIZE_PX,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: MARKER_SIZE_PX,
        border: `${MARKER_BORDER_PX}px solid ${MARKER_BORDER_COLOR}`,
        background,
        color: label?.color,
        fontSize: LABEL_FONT_SIZE_PX,
        fontWeight: LABEL_FONT_WEIGHT,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- next/og draws plain img elements */}
      {iconSrc && <img src={iconSrc} width={ICON_SIZE_PX} height={ICON_SIZE_PX} alt="" />}
      {label?.text}
    </div>
  )
}

/** The picture of a link preview: the map with the route on it and a disc on every checkpoint. */
export default function PreviewImage({ mapSrc, path, waypoints, view, size }: PreviewImageProps) {
  const markers = buildPreviewMarkers({ path, waypoints, view, size })
  return (
    <div style={{ position: 'relative', display: 'flex', width: size.width, height: size.height }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- next/og draws plain img elements */}
      <img src={mapSrc} width={size.width} height={size.height} alt="" />
      {markers.map((marker) => (
        <MarkerDisc key={marker.key} marker={marker} />
      ))}
    </div>
  )
}
