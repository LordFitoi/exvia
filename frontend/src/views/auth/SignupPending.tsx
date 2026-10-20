import Link from 'next/link'

import AuthScreenHeader from '@/views/auth/AuthScreenHeader'

export default function SignupPending() {
  return (
    <>
      <AuthScreenHeader
        title="Request received"
        subtitle="An admin has to approve your account before you can log in."
      >
        <span className="icon icon-lg icon-check"></span>
      </AuthScreenHeader>
      <div className="stack-lg">
        <div className="alert alert-success" role="status">
          <span className="icon icon-check" aria-hidden="true"></span>
          You can log in as soon as your account is approved.
        </div>
        <Link className="button button-soft button-block" href="/login">
          Back to log in
        </Link>
      </div>
    </>
  )
}
