import type { Metadata } from 'next'

import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = { title: 'Log in' }

// Rendered behind AuthGuard, which shows a skeleton until the browser session resolves.
export const instant = false

export default function LoginPage() {
  return <LoginForm />
}
