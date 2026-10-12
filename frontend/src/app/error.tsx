'use client'

import { useEffect } from 'react'

import StateView from '@/components/feedback/StateView'

interface ErrorPageProps {
  error: Error
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('Unhandled page error', error)
  }, [error])

  return (
    <main className="app-shell">
      <div className="screen-body screen-body-centered">
        <StateView
          title="Something went wrong"
          description="The page could not be shown. Try again in a moment."
        >
          <span className="icon icon-lg icon-alert"></span>
        </StateView>
        <button className="button button-primary button-lg button-block" type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  )
}
