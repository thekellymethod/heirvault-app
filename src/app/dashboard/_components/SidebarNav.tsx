'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Users, 
  // FileText, 
  UserCheck,
  LayoutDashboard,
  // Search,
  SearchCheck,
  // Globe,
  Settings,
  User,
  Archive,
  Key
} from 'lucide-react'

export function SidebarNav() {
  const pathname = usePathname()

  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Clients',
      href: '/dashboard/clients',
      icon: Users,
    },
    {
      name: 'Beneficiaries',
      href: '/dashboard/beneficiaries',
      icon: UserCheck,
    },
    {
      name: 'Policy Locator',
      href: '/dashboard/policy-locator',
      icon: SearchCheck,
    },
    {
      name: 'Receipts',
      href: '/dashboard/admin/receipts',
      icon: Archive,
    },
    {
      name: 'Invitation Codes',
      href: '/dashboard/admin/invites',
      icon: Key,
    },
  ]

  const settingsItems = [
    {
      name: 'Profile',
      href: '/dashboard/settings/profile',
      icon: User,
    },
    {
      name: 'Firm Settings',
      href: '/dashboard/settings/org',
      icon: Settings,
    },
  ]

  return (
    <nav className="space-y-1 px-2">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || 
          (item.href !== '/dashboard' && pathname?.startsWith(item.href))
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
              ${
                isActive
                  ? 'text-ink-900 shadow-sm'
                  : 'text-slateui-600 hover:text-ink-900'
              }
            `}
            style={{
              backgroundColor: isActive ? 'rgba(200, 148, 45, 0.15)' : 'transparent',
              border: isActive ? '1px solid rgba(200, 148, 45, 0.3)' : '1px solid transparent',
              color: isActive ? '#0B1220' : undefined,
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'rgba(200, 148, 45, 0.08)'
                e.currentTarget.style.borderColor = 'rgba(200, 148, 45, 0.2)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.borderColor = 'transparent'
              }
            }}
          >
            <Icon className="h-5 w-5" style={{ color: isActive ? '#C8942D' : undefined }} />
            {item.name}
          </Link>
        )
      })}

      <div className="pt-4 mt-4" style={{ borderTop: '1px solid #D9E2EE' }}>
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#52637A', fontFamily: "'Playfair Display', Georgia, serif" }}>
          Settings
        </div>
        {settingsItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname?.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
                ${
                  isActive
                    ? 'text-ink-900 shadow-sm'
                    : 'text-slateui-600 hover:text-ink-900'
                }
              `}
              style={{
                backgroundColor: isActive ? 'rgba(200, 148, 45, 0.15)' : 'transparent',
                border: isActive ? '1px solid rgba(200, 148, 45, 0.3)' : '1px solid transparent',
                color: isActive ? '#0B1220' : undefined,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(200, 148, 45, 0.08)'
                  e.currentTarget.style.borderColor = 'rgba(200, 148, 45, 0.2)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              <Icon className="h-5 w-5" style={{ color: isActive ? '#C8942D' : undefined }} />
              {item.name}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

