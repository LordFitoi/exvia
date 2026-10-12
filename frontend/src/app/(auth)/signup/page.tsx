import type { Metadata } from 'next'

import SignupForm from '@/components/auth/SignupForm'

export const metadata: Metadata = { title: 'Create account' }

// Rendered behind AuthGuard, which shows a skeleton until the browser session resolves.
export const instant = false

export default function SignupPage() {
  return <SignupForm />
}
