const ADMIN_PATH = '/admin/'

interface ProfileAccountSectionsProps {
  email: string
  isStaff: boolean
  onLogout: () => void
}

/** The account email, the link to the admin site for staff, and the log out button. */
export default function ProfileAccountSections({ email, isStaff, onLogout }: ProfileAccountSectionsProps) {
  return (
    <>
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
              <span className="list-item-title">{email}</span>
              <span className="list-item-meta">Email</span>
            </span>
          </li>
        </ul>
      </section>
      {isStaff && (
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
      <button className="button button-soft button-block" type="button" onClick={onLogout}>
        Log out
      </button>
    </>
  )
}
