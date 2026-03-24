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
      {/* On mobile: no left margin (sidebar is overlay). On desktop: ml-60 */}
      <main className="md:ml-60 min-h-screen">
        <div className="p-4 pt-16 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
