import { Sidebar } from './Sidebar'
import type { Profile } from '@/types'

interface DashboardLayoutProps {
  profile: Profile
  children: React.ReactNode
}

export function DashboardLayout({ profile, children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar profile={profile} />
      <main className="ml-60 min-h-screen">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
