'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Users, 
  FileText, 
  UserCheck,
  LayoutDashboard
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
      name: 'Policies',
      href: '/dashboard/policies',
      icon: FileText,
    },
    {
      name: 'Beneficiaries',
      href: '/dashboard/beneficiaries',
      icon: UserCheck,
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
              flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
              ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-slate-50'
              }
            `}
          >
            <Icon className="h-5 w-5" />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}

