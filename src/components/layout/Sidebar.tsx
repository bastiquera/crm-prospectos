'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart3, Users, Kanban, TrendingUp,
  Database, Settings, LogOut, Inbox, Package, ShoppingBag, Percent, Menu, X, DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'
import { useState } from 'react'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const adminNav: NavItem[] = [
  { href: '/admin',                label: 'Dashboard',       icon: BarChart3 },
  { href: '/admin/leads',          label: 'Todos los leads', icon: Database },
  { href: '/admin/sales',          label: 'Ventas',          icon: ShoppingBag },
  { href: '/admin/commissions',    label: 'Comisiones',      icon: Percent },
  { href: '/admin/vendors',        label: 'Vendedores',      icon: Users },
  { href: '/admin/products',       label: 'Productos',       icon: Package },
  { href: '/admin/pipeline',       label: 'Pipeline',        icon: Settings },
  { href: '/admin/metrics',        label: 'Métricas',        icon: TrendingUp },
  { href: '/admin/system-cost',    label: 'Costo de uso',    icon: DollarSign },
]

const sellerNav: NavItem[] = [
  { href: '/seller',               label: 'Nuevos contactos',  icon: Inbox },
  { href: '/seller/pipeline',      label: 'Panel de clientes', icon: Kanban },
  { href: '/seller/metrics',       label: 'Mis métricas',      icon: TrendingUp },
  { href: '/seller/commissions',   label: 'Mis comisiones',    icon: Percent },
]

interface SidebarProps { profile: Profile }

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const nav      = profile.role === 'admin' ? adminNav : sellerNav
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleNavClick() {
    setOpen(false)
  }

  const sidebarContent = (
    <aside className={cn(
      'fixed inset-y-0 left-0 w-60 bg-[#0B1120] flex flex-col z-40 border-r border-slate-800/60 transition-transform duration-300',
      // On mobile: slide in/out. On desktop: always visible
      'md:translate-x-0',
      open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    )}>

      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-slate-800/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/25">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <span
                className="text-white font-bold text-[15px] tracking-tight block leading-none"
                style={{ fontFamily: 'var(--font-jakarta)' }}
              >
                CRM Pro
              </span>
              <span className="text-slate-500 text-[10px] font-medium tracking-widest uppercase mt-0.5 block">
                {profile.role === 'admin' ? 'Administrador' : 'Vendedor'}
              </span>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={() => setOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href ||
            (href !== '/admin' && href !== '/seller' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all group',
                active
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              )}
            >
              <Icon
                className={cn(
                  'w-[15px] h-[15px] flex-shrink-0',
                  active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                )}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-slate-800/60 pt-3 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold shadow-sm"
            style={{ backgroundColor: profile.color_bg, color: profile.color_text }}
          >
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-slate-100 text-[13px] font-semibold truncate leading-tight"
              style={{ fontFamily: 'var(--font-jakarta)' }}
            >
              {profile.full_name}
            </p>
            <p className="text-slate-500 text-[11px] mt-0.5 truncate">{profile.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-all w-full font-medium"
        >
          <LogOut className="w-[14px] h-[14px]" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Hamburger button — mobile only, shown when sidebar is closed */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-[#0B1120] border border-slate-800/60 text-slate-300 hover:text-white shadow-lg transition-all',
          open && 'hidden'
        )}
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop — mobile only */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {sidebarContent}
    </>
  )
}
