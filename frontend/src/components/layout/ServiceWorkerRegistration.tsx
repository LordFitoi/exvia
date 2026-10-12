'use client'

import { useEffect } from 'react'

const SERVICE_WORKER_URL = '/sw.js'

/** Registers the service worker in production only, so dev hot reload is not cached. */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register(SERVICE_WORKER_URL, { scope: '/', updateViaCache: 'none' })
      .catch((error) => console.error('Service worker registration failed', error))
  }, [])

  return null
}
