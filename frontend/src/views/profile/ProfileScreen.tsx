'use client'

import { useAuth } from '@/hooks/useAuth'

const INITIALS_LENGTH = 2
const ADMIN_PATH = '/admin/'

export default function ProfileScreen() {
  const { user, logout } = useAuth()
  if (!user) return null

  const initials = user.username.slice(0, INITIALS_LENGTH).toUpperCase()

  return (
    <main className="screen-body">
      <h1 className="visually-hidden">Profile</h1>
      <div className="profile-header">
        <span className="avatar avatar-xl" aria-hidden="true">
          {initials}
        </span>
        <h2 className="profile-name">{user.username}</h2>
      </div>
      <section aria-labelledby="account-title">
        <div className="section-heading">
          <h3 id="account-title">Account</h3>
        </div>
        <ul className="list">
          <li className="list-item">
            <span className="list-item-icon" aria-hidden="true">
              <span className="icon icon-mail"></span>
            </span>
            <span className="list-item-body">
              <span className="list-item-title">{user.email}</span>
              <span className="list-item-meta">Email</span>
            </span>
          </li>
        </ul>
      </section>
      {user.is_staff && (
        <section aria-labelledby="admin-title">
          <div className="section-heading">
            <h3 id="admin-title">Administration</h3>
          </div>
          <ul className="list">
            <li>
              {/* A plain anchor: /admin/ is Django, proxied outside the Next.js router. */}
              <a className="list-item" href={ADMIN_PATH}>
                <span className="list-item-icon" aria-hidden="true">
                  <span className="icon icon-lock"></span>
                </span>
                <span className="list-item-body">
                  <span className="list-item-title">Admin site</span>
                  <span className="list-item-meta">Approve accounts and manage data</span>
                </span>
                <span className="icon icon-chevron-right" aria-hidden="true"></span>
              </a>
            </li>
          </ul>
        </section>
      )}
      <button className="button button-soft button-block" type="button" onClick={logout}>
        Log out
      </button>
    </main>
  )
}
