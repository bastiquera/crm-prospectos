import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, Trophy, Users, Target } from 'lucide-react'
import { RealtimeRefresher } from '@/components/RealtimeRefresher'

export const dynamic = 'force-dynamic'

export default async function SellerMetricsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: leads }, { data: sales }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('leads').select('id, status, created_at').eq('assigned_to', user!.id),
    supabase.from('sales').select('value, product, closed_at').eq('user_id', user!.id).is('deleted_at', null).order('closed_at', { ascending: false }),
  ])

  const totalLeads       = leads?.length ?? 0
  const inProgress       = leads?.filter((l) => l.status === 'assigned').length ?? 0
  const closed           = leads?.filter((l) => l.status === 'closed').length ?? 0
  const totalValue       = sales?.reduce((s, sale) => s + Number(sale.value), 0) ?? 0
  const conversionRate   = totalLeads > 0 ? Math.round((closed / totalLeads) * 100) : 0

  const stats = [
    { label: 'Leads tomados',      value: totalLeads,           icon: Users,     color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { label: 'En proceso',         value: inProgress,           icon: Target,    color: 'bg-orange-50 text-orange-600 border-orange-200' },
    { label: 'Ventas cerradas',    value: closed,               icon: Trophy,    color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
    { label: 'Tasa de conversión', value: `${conversionRate}%`, icon: TrendingUp,color: 'bg-green-50 text-green-600 border-green-200' },
  ]

  return (
    <div className="space-y-6">
      <RealtimeRefresher tables={['leads', 'sales']} />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis métricas</h1>
        <p className="text-muted-foreground text-sm mt-1">Tu rendimiento personal</p>
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

      {/* Total value */}
      <div className="bg-gradient-to-r from-primary to-indigo-600 rounded-xl p-6 text-white">
        <p className="text-white/70 text-sm font-medium">Total vendido</p>
        <p className="text-4xl font-bold mt-1">{formatCurrency(totalValue)}</p>
        <p className="text-white/60 text-xs mt-2">{closed} venta{closed !== 1 ? 's' : ''} cerrada{closed !== 1 ? 's' : ''}</p>
      </div>

      {/* Recent sales */}
      {sales && sales.length > 0 && (
        <div className="bg-white rounded-xl border border-border/60 shadow-card">
          <div className="px-5 py-4 border-b border-border/40">
            <h3 className="font-semibold text-sm">Ventas recientes</h3>
          </div>
          <div className="divide-y divide-border/40">
            {sales.slice(0, 10).map((sale, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{sale.product}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(sale.closed_at).toLocaleDateString('es-CL')}
                  </p>
                </div>
                <span className="text-sm font-bold text-green-600">{formatCurrency(Number(sale.value))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
