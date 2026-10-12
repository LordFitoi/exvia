'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface TabDestination {
  href: string
  label: string
  iconClass: string
}

const TABS: readonly TabDestination[] = [
  { href: '/', label: 'Home', iconClass: 'icon-home' },
  { href: '/map', label: 'Map', iconClass: 'icon-pin' },
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
      {TABS.map(({ href, label, iconClass }) => (
        <Link
          key={href}
          className="tab-bar-item"
          href={href}
          aria-current={isCurrentTab(pathname, href) ? 'page' : undefined}
        >
          <span className={`icon icon-lg ${iconClass}`} aria-hidden="true"></span>
          {label}
        </Link>
      ))}
    </nav>
  )
}
