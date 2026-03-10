'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart3, Users, Kanban, TrendingUp,
  Database, Settings, LogOut, Inbox, Package
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const adminNav: NavItem[] = [
  { href: '/admin',           label: 'Dashboard',      icon: BarChart3 },
  { href: '/admin/leads',     label: 'Todos los leads', icon: Database },
  { href: '/admin/vendors',   label: 'Vendedores',     icon: Users },
  { href: '/admin/products',  label: 'Productos',      icon: Package },
  { href: '/admin/pipeline',  label: 'Pipeline',       icon: Settings },
  { href: '/admin/metrics',   label: 'Métricas',       icon: TrendingUp },
]

const sellerNav: NavItem[] = [
  { href: '/seller',          label: 'Leads nuevos', icon: Inbox },
  { href: '/seller/pipeline', label: 'Mi pipeline',  icon: Kanban },
  { href: '/seller/metrics',  label: 'Mis métricas', icon: TrendingUp },
]

interface SidebarProps {
  profile: Profile
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const nav = profile.role === 'admin' ? adminNav : sellerNav

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-[#0F172A] flex flex-col z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-base tracking-tight">CRM Pro</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/admin' && href !== '/seller' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group',
                active
                  ? 'bg-primary text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-white' : 'text-slate-500 group-hover:text-white')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{ backgroundColor: profile.color_bg, color: profile.color_text }}
          >
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{profile.full_name}</p>
            <p className="text-slate-500 text-xs capitalize">{profile.role === 'admin' ? 'Administrador' : 'Vendedor'}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all w-full"
        >
          <LogOut className="w-4 h-4 text-slate-500" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
