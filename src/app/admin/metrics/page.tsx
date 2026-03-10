import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { LEAD_SOURCE_LABELS, type Profile } from '@/types'
import { TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminMetricsPage() {
  const supabase = await createClient()

  const [{ data: leads }, { data: sales }, { data: sellers }] = await Promise.all([
    supabase.from('leads').select('id, status, source, assigned_to, created_at'),
    supabase.from('sales').select('value, user_id, product, closed_at'),
    supabase.from('profiles').select('*').eq('role', 'seller').order('created_at'),
  ])

  // Leads by source
  const bySource = Object.entries(LEAD_SOURCE_LABELS).map(([source, label]) => ({
    source,
    label,
    count: leads?.filter((l) => l.source === source).length ?? 0,
  })).sort((a, b) => b.count - a.count)

  const totalLeads = leads?.length ?? 0
  const totalValue = sales?.reduce((s, sale) => s + Number(sale.value), 0) ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Métricas globales</h1>
        <p className="text-muted-foreground text-sm mt-1">Análisis completo de leads y ventas</p>
      </div>

      {/* Leads by source */}
      <div className="bg-white rounded-xl border border-border/60 shadow-card p-5">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          Leads por fuente
        </h3>
        <div className="space-y-3">
          {bySource.map(({ source, label, count }) => {
            const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0
            return (
              <div key={source}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground">{label}</span>
                  <span className="text-sm font-medium">{count} <span className="text-muted-foreground font-normal text-xs">({pct}%)</span></span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Per seller performance */}
      <div className="bg-white rounded-xl border border-border/60 shadow-card">
        <div className="px-5 py-4 border-b border-border/40">
          <h3 className="font-semibold text-sm">Rendimiento detallado por vendedor</h3>
        </div>
        <div className="divide-y divide-border/40">
          {(sellers ?? []).map((seller: Profile) => {
            const sellerLeads  = leads?.filter((l) => l.assigned_to === seller.id) ?? []
            const sellerSales  = sales?.filter((s) => s.user_id === seller.id) ?? []
            const sellerValue  = sellerSales.reduce((s, sale) => s + Number(sale.value), 0)
            const conv         = sellerLeads.length > 0
              ? Math.round((sellerLeads.filter((l) => l.status === 'closed').length / sellerLeads.length) * 100)
              : 0
            const pct = totalValue > 0 ? Math.round((sellerValue / totalValue) * 100) : 0

            return (
              <div key={seller.id} className="px-5 py-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: seller.color_bg, color: seller.color_text }}
                  >
                    {seller.full_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{seller.full_name}</p>
                    <p className="text-xs text-muted-foreground">{sellerLeads.length} leads · {conv}% conversión</p>
                  </div>
                  <span className="text-sm font-bold text-green-600">{formatCurrency(sellerValue)}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: seller.color_bg }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{pct}% del total</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
