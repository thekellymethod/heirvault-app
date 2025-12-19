'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Users, 
  FileText, 
  UserCheck,
  LayoutDashboard,
  Search,
  SearchCheck,
  Globe,
  Settings,
  User
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
                  ? 'bg-gold-500/10 text-ink-900 border border-gold-500/20 shadow-sm'
                  : 'text-slateui-600 hover:bg-paper-100 hover:text-ink-900'
              }
            `}
          >
            <Icon className="h-5 w-5" />
            {item.name}
          </Link>
        )
      })}

      <div className="pt-4 mt-4 border-t border-slateui-200">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slateui-500 mb-1">
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
                    ? 'bg-gold-500/10 text-ink-900 border border-gold-500/20 shadow-sm'
                    : 'text-slateui-600 hover:bg-paper-100 hover:text-ink-900'
                }
              `}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

