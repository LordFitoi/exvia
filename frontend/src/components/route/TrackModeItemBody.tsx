/** The inside of the track mode row: like free mode, but it says that the path ridden is kept as a route. */
export default function TrackModeItemBody() {
  return (
    <>
      <span className="list-item-icon list-item-icon-primary" aria-hidden="true">
        <span className="icon icon-locate"></span>
      </span>
      <span className="list-item-body">
        <span className="list-item-title">Track mode</span>
        <span className="list-item-meta">Ride anywhere and save the path as a route</span>
      </span>
    </>
  )
}
