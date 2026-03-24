import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { RealtimeRefresher } from '@/components/RealtimeRefresher'
import { TrendingUp, DollarSign, CheckCircle2, Clock, Percent, CreditCard } from 'lucide-react'

export const dynamic = 'force-dynamic'

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

type SaleRow = {
  id: string
  value: number
  product: string
  commission_percentage: number
  commission_amount: number
  commission_payment_id: string | null
  closed_at: string
}

export default async function SellerCommissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Try full query with commission columns; fall back to basic if columns missing
  const { data: salesFull, error: salesError } = await supabase
    .from('sales')
    .select('id, value, product, commission_percentage, commission_amount, commission_payment_id, closed_at')
    .eq('user_id', user!.id)
    .is('deleted_at', null)
    .order('closed_at', { ascending: false })

  let sales: SaleRow[] | null = salesFull as SaleRow[] | null

  if (salesError) {
    // Commission columns may not exist yet — fall back to basic columns
    const { data: salesBasic } = await supabase
      .from('sales')
      .select('id, value, product, closed_at')
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .order('closed_at', { ascending: false })

    sales = (salesBasic ?? []).map((s) => ({
      ...s,
      commission_percentage: 0,
      commission_amount: 0,
      commission_payment_id: null,
    })) as SaleRow[]
  }

  const { data: payments } = await supabase
    .from('commission_payments')
    .select('id, period_start, period_end, total_amount, sales_count, notes, paid_at')
    .eq('seller_id', user!.id)
    .order('paid_at', { ascending: false })

  const totalEarned = sales?.reduce((s, x) => s + Number(x.commission_amount), 0) ?? 0
  const totalPaid   = payments?.reduce((s, p) => s + Number(p.total_amount), 0) ?? 0
  const pendingAmount = sales
    ?.filter((s) => !s.commission_payment_id)
    .reduce((sum, s) => sum + Number(s.commission_amount), 0) ?? 0

  const stats = [
    {
      label: 'Total ganado',
      value: formatCurrency(totalEarned),
      icon: TrendingUp,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      desc: 'Comisiones acumuladas',
    },
    {
      label: 'Ya cobrado',
      value: formatCurrency(totalPaid),
      icon: CheckCircle2,
      color: 'bg-green-50 text-green-600 border-green-200',
      desc: `${payments?.length ?? 0} pago${(payments?.length ?? 0) !== 1 ? 's' : ''} recibido${(payments?.length ?? 0) !== 1 ? 's' : ''}`,
    },
    {
      label: 'Por cobrar',
      value: formatCurrency(pendingAmount),
      icon: Clock,
      color: pendingAmount > 0
        ? 'bg-amber-50 text-amber-600 border-amber-200'
        : 'bg-slate-50 text-slate-500 border-slate-200',
      desc: 'Comisiones pendientes de pago',
    },
  ]

  return (
    <div className="space-y-6">
      <RealtimeRefresher tables={['sales', 'commission_payments']} />

      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Percent className="w-6 h-6 text-primary" />
          Mis comisiones
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tus ganancias por ventas cerradas
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color, desc }) => (
          <div key={label} className="bg-white rounded-xl border border-border/60 shadow-card p-5">
            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs font-medium text-foreground mt-0.5">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      {/* Pending highlight */}
      {pendingAmount > 0 && (
        <div className="bg-gradient-to-r from-indigo-600 to-primary rounded-xl p-5 text-white flex items-center justify-between">
          <div>
            <p className="text-white/70 text-xs font-medium">Comisiones por cobrar</p>
            <p className="text-3xl font-bold mt-0.5">{formatCurrency(pendingAmount)}</p>
            <p className="text-white/60 text-xs mt-1">El administrador te informará cuando se registre el pago.</p>
          </div>
          <Clock className="w-10 h-10 text-white/20" />
        </div>
      )}

      {/* Sales with commission detail */}
      <div className="bg-white rounded-xl border border-border/60 shadow-card">
        <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Mis ventas y comisiones</h3>
          <span className="ml-auto text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
            {sales?.length ?? 0}
          </span>
        </div>

        {!sales || sales.length === 0 ? (
          <div className="px-5 py-12 text-center text-muted-foreground text-sm">
            No tienes ventas registradas aún
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/50">
                  {['Fecha', 'Producto', 'Valor venta', '% Comisión', 'Tu comisión', 'Estado'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] text-muted-foreground font-semibold uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {sales.map((sale) => (
                  <tr key={sale.id} className={`hover:bg-slate-50/40 transition-colors ${!!sale.commission_payment_id ? 'opacity-70' : ''}`}>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(sale.closed_at).toLocaleDateString('es-CL', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        {sale.product}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-foreground whitespace-nowrap">
                      {formatCurrency(Number(sale.value))}
                    </td>
                    <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                      {Number(sale.commission_percentage) > 0
                        ? <span className="text-indigo-600 font-medium">{Number(sale.commission_percentage)}%</span>
                        : <span className="text-muted-foreground/50">—</span>
                      }
                    </td>
                    <td className="px-5 py-3.5 font-bold text-indigo-600 whitespace-nowrap">
                      {Number(sale.commission_amount) > 0
                        ? formatCurrency(Number(sale.commission_amount))
                        : <span className="text-muted-foreground/40 font-normal text-xs">Sin comisión</span>
                      }
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {!!sale.commission_payment_id
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle2 className="w-3 h-3" /> Cobrada
                          </span>
                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" /> Pendiente
                          </span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment history */}
      <div className="bg-white rounded-xl border border-border/60 shadow-card">
        <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Pagos recibidos</h3>
          <span className="ml-auto text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
            {payments?.length ?? 0}
          </span>
        </div>

        {!payments || payments.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground text-sm">
            No hay pagos registrados aún
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/50">
                  {['Fecha de pago', 'Período cubierto', '# Ventas', 'Monto cobrado', 'Notas'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] text-muted-foreground font-semibold uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {payments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(pay.paid_at).toLocaleDateString('es-CL', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(pay.period_start)} — {fmtDate(pay.period_end)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-center">{pay.sales_count}</td>
                    <td className="px-5 py-3.5 font-bold text-green-600 whitespace-nowrap">
                      {formatCurrency(Number(pay.total_amount))}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-[200px] truncate">
                      {pay.notes ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
