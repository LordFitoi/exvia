export default function LoadingScreen() {
  return (
    <main className="app-shell">
      <div className="screen-body" role="status" aria-busy="true">
        <span className="visually-hidden">Loading</span>
        <span className="skeleton skeleton-title" aria-hidden="true"></span>
        <span className="skeleton skeleton-line" aria-hidden="true"></span>
        <span className="skeleton skeleton-line" aria-hidden="true"></span>
      </div>
    </main>
  )
}
