import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { Users, Inbox, Trophy, TrendingUp, BarChart3 } from 'lucide-react'
import type { Profile } from '@/types'
import { RealtimeRefresher } from '@/components/RealtimeRefresher'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [{ data: leads }, { data: sales }, { data: sellers }] = await Promise.all([
    supabase.from('leads').select('id, status, source, assigned_to, created_at'),
    supabase.from('sales').select('value, user_id, closed_at').is('deleted_at', null),
    supabase.from('profiles').select('*').eq('role', 'seller').eq('is_active', true),
  ])

  const totalLeads    = leads?.length ?? 0
  const available     = leads?.filter((l) => l.status === 'available').length ?? 0
  const closed        = leads?.filter((l) => l.status === 'closed').length ?? 0
  const totalValue    = sales?.reduce((s, sale) => s + Number(sale.value), 0) ?? 0
  const conversion    = totalLeads > 0 ? Math.round((closed / totalLeads) * 100) : 0

  const stats = [
    { label: 'Total leads',       value: totalLeads,          icon: Inbox,     color: 'text-blue-600   bg-blue-50   border-blue-200' },
    { label: 'Disponibles',       value: available,           icon: BarChart3, color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { label: 'Ventas cerradas',   value: closed,              icon: Trophy,    color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
    { label: 'Tasa conversión',   value: `${conversion}%`,    icon: TrendingUp,color: 'text-green-600  bg-green-50  border-green-200' },
  ]

  // Per-seller stats
  const sellerStats = (sellers ?? []).map((seller: Profile) => {
    const sellerLeads  = leads?.filter((l) => l.assigned_to === seller.id) ?? []
    const sellerSales  = sales?.filter((s) => s.user_id === seller.id) ?? []
    const sellerValue  = sellerSales.reduce((s, sale) => s + Number(sale.value), 0)
    const conv         = sellerLeads.length > 0
      ? Math.round((sellerLeads.filter((l) => l.status === 'closed').length / sellerLeads.length) * 100)
      : 0

    return {
      ...seller,
      leads_taken:   sellerLeads.length,
      in_progress:   sellerLeads.filter((l) => l.status === 'assigned').length,
      sales_closed:  sellerSales.length,
      total_value:   sellerValue,
      conversion:    conv,
    }
  }).sort((a, b) => b.total_value - a.total_value)

  return (
    <div className="space-y-6">
      <RealtimeRefresher tables={['leads', 'sales']} />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visión general del equipo de ventas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Total revenue */}
      <div className="bg-gradient-to-r from-[#0F172A] to-slate-700 rounded-xl p-6 text-white">
        <p className="text-white/60 text-sm">Ingresos totales</p>
        <p className="text-5xl font-bold mt-1">{formatCurrency(totalValue)}</p>
        <p className="text-white/50 text-xs mt-2">{closed} venta{closed !== 1 ? 's' : ''} registrada{closed !== 1 ? 's' : ''}</p>
      </div>

      {/* Sellers table */}
      <div className="bg-white rounded-xl border border-border/60 shadow-card">
        <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Rendimiento por vendedor</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                {['Vendedor','Leads','En proceso','Ventas','Conversión','Total vendido'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {sellerStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground text-sm">
                    Sin vendedores registrados
                  </td>
                </tr>
              ) : sellerStats.map((seller) => (
                <tr key={seller.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: seller.color_bg, color: seller.color_text }}
                      >
                        {seller.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{seller.full_name}</p>
                        <p className="text-xs text-muted-foreground">{seller.color_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-medium">{seller.leads_taken}</td>
                  <td className="px-5 py-3.5 text-orange-600 font-medium">{seller.in_progress}</td>
                  <td className="px-5 py-3.5 text-yellow-600 font-medium">{seller.sales_closed}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      {seller.conversion}%
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-green-700">{formatCurrency(seller.total_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
