import Link from 'next/link'

import StateView from '@/components/feedback/StateView'

export default function NotFoundPage() {
  return (
    <main className="app-shell">
      <div className="screen-body screen-body-centered">
        <StateView title="Page not found" description="This page does not exist or has moved.">
          <span className="icon icon-lg icon-search"></span>
        </StateView>
        <Link className="button button-primary button-lg button-block" href="/">
          Go home
        </Link>
      </div>
    </main>
  )
}
