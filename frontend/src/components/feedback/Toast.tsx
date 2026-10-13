'use client'

import { useEffect } from 'react'

const AUTO_DISMISS_MS = 5000

interface ToastProps {
  message: string
  onDismiss: () => void
}

export default function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => window.clearTimeout(timeoutId)
  }, [message, onDismiss])

  return (
    <div className="toast" role="status">
      <span className="icon icon-check" aria-hidden="true"></span>
      {message}
    </div>
  )
}
