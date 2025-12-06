import { UserButton } from '@clerk/nextjs'
import { SidebarNav } from './_components/SidebarNav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-50">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-slate-800 bg-slate-900/40">
        <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/40">
            <span className="text-sm font-semibold text-emerald-400">HR</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold tracking-tight">
              HeirRegistry
            </span>
            <span className="text-[10px] text-slate-400">
              Life Insurance Registry
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav />
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/40 px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-slate-50">
              Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: 'h-8 w-8',
                },
              }}
            />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

