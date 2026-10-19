/** The inside of the free mode row: it looks like a route row, but says plainly that there is no route. */
export default function FreeModeItemBody() {
  return (
    <>
      <span className="list-item-icon list-item-icon-primary" aria-hidden="true">
        <span className="icon icon-navigation"></span>
      </span>
      <span className="list-item-body">
        <span className="list-item-title">Free mode</span>
        <span className="list-item-meta">No route, ride wherever you want</span>
      </span>
    </>
  )
}
