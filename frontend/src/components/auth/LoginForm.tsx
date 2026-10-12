'use client'

import Link from 'next/link'

import AuthScreenHeader from '@/components/auth/AuthScreenHeader'
import FormAlert from '@/components/auth/FormAlert'
import SubmitButton from '@/components/auth/SubmitButton'
import TextField from '@/components/auth/TextField'
import { useAuth } from '@/hooks/useAuth'
import { useFormSubmission } from '@/hooks/useFormSubmission'

const FIELD_NAMES = ['username', 'password'] as const

export default function LoginForm() {
  const { login } = useAuth()
  const { isPending, fieldErrors, formError, handleSubmit } = useFormSubmission(
    ({ username, password }) => login({ username: username.trim(), password }),
    FIELD_NAMES,
  )

  return (
    <>
      <AuthScreenHeader title="Welcome back" subtitle="Log in to see your clans and rides.">
        <span className="icon icon-lg icon-navigation"></span>
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
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            error={fieldErrors.password}
          />
        </div>
        <div className="stack-sm">
          <SubmitButton label="Log in" isPending={isPending} />
          <Link className="button button-soft button-block" href="/signup">
            Create account
          </Link>
        </div>
      </form>
    </>
  )
}
