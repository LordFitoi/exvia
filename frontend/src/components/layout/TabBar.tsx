'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface TabDestination {
  href: string
  label: string
  iconClass: string
  /** The one raised, filled destination of the bar. */
  isAction?: boolean
}

const TABS: readonly TabDestination[] = [
  { href: '/', label: 'Home', iconClass: 'icon-home' },
  { href: '/map', label: 'Map', iconClass: 'icon-pin' },
  { href: '/ride', label: 'Ride', iconClass: 'icon-flag-checkered', isAction: true },
  { href: '/clans', label: 'Clans', iconClass: 'icon-users' },
  { href: '/profile', label: 'Profile', iconClass: 'icon-user' },
]

const ROOT_PATH = '/'

const isCurrentTab = (pathname: string, href: string): boolean => {
  const normalizedPath = pathname.replace(/\/+$/, '') || ROOT_PATH
  if (href === ROOT_PATH) return normalizedPath === ROOT_PATH
  return normalizedPath === href || normalizedPath.startsWith(`${href}/`)
}

export default function TabBar() {
  const pathname = usePathname()

  return (
    <nav className="tab-bar" aria-label="Main">
      {TABS.map(({ href, label, iconClass, isAction }) => (
        <Link
          key={href}
          className={isAction ? 'tab-bar-item tab-bar-action' : 'tab-bar-item'}
          href={href}
          aria-current={isCurrentTab(pathname, href) ? 'page' : undefined}
        >
          {isAction ? (
            <span className="tab-bar-action-icon">
              <span className={`icon icon-lg ${iconClass}`} aria-hidden="true"></span>
            </span>
          ) : (
            <span className={`icon icon-lg ${iconClass}`} aria-hidden="true"></span>
          )}
          {label}
        </Link>
      ))}
    </nav>
  )
}
