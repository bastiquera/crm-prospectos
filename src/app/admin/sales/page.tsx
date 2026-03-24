import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { ShoppingBag } from 'lucide-react'
import { DeleteSaleButton } from '@/components/admin/DeleteSaleButton'
import { RealtimeRefresher } from '@/components/RealtimeRefresher'

export const dynamic = 'force-dynamic'

export default async function AdminSalesPage() {
  const supabase = await createClient()

  const { data: sales } = await supabase
    .from('sales')
    .select(`
      id,
      value,
      product,
      notes,
      closed_at,
      lead:leads!sales_lead_id_fkey(id, name, email),
      seller:profiles!sales_user_id_fkey(id, full_name, color_bg, color_text)
    `)
    .is('deleted_at', null)
    .order('closed_at', { ascending: false })

  const totalValue = sales?.reduce((s, sale) => s + Number(sale.value), 0) ?? 0

  return (
    <div className="space-y-6">
      <RealtimeRefresher tables={['sales', 'leads']} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Historial de ventas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {sales?.length ?? 0} ventas registradas · Total: {formatCurrency(totalValue)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border/60 shadow-card">
        <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Todas las ventas</h3>
          <span className="ml-auto text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
            {sales?.length ?? 0}
          </span>
        </div>

        {!sales || sales.length === 0 ? (
          <div className="px-5 py-12 text-center text-muted-foreground text-sm">
            Sin ventas registradas aún
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/50">
                  {['Prospecto', 'Vendedora', 'Producto', 'Valor', 'Fecha', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] text-muted-foreground font-semibold uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/40 transition-colors group">

                    {/* Prospecto */}
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-foreground">{(sale.lead as any)?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{(sale.lead as any)?.email ?? ''}</p>
                    </td>

                    {/* Vendedora */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{
                            backgroundColor: (sale.seller as any)?.color_bg ?? '#6366F1',
                            color: (sale.seller as any)?.color_text ?? '#fff',
                          }}
                        >
                          {(sale.seller as any)?.full_name?.charAt(0) ?? '?'}
                        </div>
                        <span className="text-sm text-foreground whitespace-nowrap">
                          {(sale.seller as any)?.full_name ?? '—'}
                        </span>
                      </div>
                    </td>

                    {/* Producto */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        {sale.product}
                      </span>
                    </td>

                    {/* Valor */}
                    <td className="px-5 py-3.5 font-bold text-green-600 whitespace-nowrap">
                      {formatCurrency(Number(sale.value))}
                    </td>

                    {/* Fecha */}
                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(sale.closed_at).toLocaleDateString('es-CL', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>

                    {/* Acciones */}
                    <td className="px-5 py-3.5">
                      <DeleteSaleButton
                        saleId={sale.id}
                        saleInfo={`${sale.product} · ${formatCurrency(Number(sale.value))}`}
                      />
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
