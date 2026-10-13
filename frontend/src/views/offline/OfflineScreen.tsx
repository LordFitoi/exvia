import Link from 'next/link'

import StateView from '@/components/feedback/StateView'

/** Link instead of a button handler: this page must not need any chunk that is not cached. */
export default function OfflineScreen() {
  return (
    <main className="app-shell">
      <div className="screen-body screen-body-centered">
        <StateView
          title="You are offline"
          description="Exvia needs a connection to load your data. Check your signal and try again."
        >
          <span className="icon icon-lg icon-alert"></span>
        </StateView>
        <Link className="button button-primary button-lg button-block" href="/" prefetch={false}>
          Try again
        </Link>
      </div>
    </main>
  )
}
