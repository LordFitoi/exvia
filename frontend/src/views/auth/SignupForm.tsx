'use client'

import Link from 'next/link'
import { useState } from 'react'

import AuthScreenHeader from '@/views/auth/AuthScreenHeader'
import SignupPending from '@/views/auth/SignupPending'
import FormAlert from '@/components/form/FormAlert'
import SubmitButton from '@/components/form/SubmitButton'
import TextField from '@/components/form/TextField'
import { useAuth } from '@/hooks/useAuth'
import { useFormSubmission } from '@/hooks/useFormSubmission'

const FIELD_NAMES = ['username', 'email', 'password'] as const

export default function SignupForm() {
  const { signup } = useAuth()
  const [isRegistered, setIsRegistered] = useState(false)
  const { isPending, fieldErrors, formError, handleSubmit } = useFormSubmission(
    async ({ username, email, password }) => {
      await signup({ username: username.trim(), email: email.trim(), password })
      setIsRegistered(true)
    },
    FIELD_NAMES,
  )

  if (isRegistered) return <SignupPending />

  return (
    <>
      <AuthScreenHeader title="Join Exvia" subtitle="Create an account to find your clan.">
        <span className="icon icon-lg icon-user"></span>
      </AuthScreenHeader>
      <form className="stack-lg" onSubmit={handleSubmit}>
        <FormAlert message={formError} />
        <div className="stack">
          <TextField
            name="username"
            label="Username"
            autoComplete="username"
            error={fieldErrors.username}
          />
          <TextField
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            error={fieldErrors.email}
          />
          <TextField
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters, not only numbers."
            error={fieldErrors.password}
          />
        </div>
        <div className="stack-sm">
          <SubmitButton label="Create account" isPending={isPending} />
          <Link className="button button-soft button-block" href="/login">
            I already have an account
          </Link>
        </div>
      </form>
    </>
  )
}
