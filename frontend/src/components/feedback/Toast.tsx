'use client'

import { useEffect } from 'react'

const AUTO_DISMISS_MS = 5000

interface ToastProps {
  message: string
  /** The icon class in front of the message; a check by default. */
  iconClass?: string
  onDismiss: () => void
}

export default function Toast({ message, iconClass = 'icon-check', onDismiss }: ToastProps) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => window.clearTimeout(timeoutId)
  }, [message, onDismiss])

  return (
    <div className="toast" role="status">
      <span className={`icon ${iconClass}`} aria-hidden="true"></span>
      {message}
    </div>
  )
}
