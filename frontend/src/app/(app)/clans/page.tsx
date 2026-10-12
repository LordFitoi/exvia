import StateView from '@/components/feedback/StateView'

// Rendered behind AuthGuard, which shows a skeleton until the browser session resolves.
export const instant = false

export default function ClansPage() {
  return (
    <main className="screen-body">
      <h1 className="text-heading">Clans</h1>
      <StateView
        title="No clans yet"
        description="Clans you join will be listed here, with their notices and rides."
      >
        <span className="icon icon-lg icon-users"></span>
      </StateView>
    </main>
  )
}
