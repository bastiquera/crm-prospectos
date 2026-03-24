import { createClient } from '@/lib/supabase/server'
import { CommissionsAdmin } from '@/components/admin/CommissionsAdmin'
import { RealtimeRefresher } from '@/components/RealtimeRefresher'
import { Percent } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminCommissionsPage() {
  const supabase = await createClient()

  const [{ data: sellers }, { data: sales }, { data: payments }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'seller')
      .eq('is_active', true)
      .order('full_name'),

    supabase
      .from('sales')
      .select(`
        id, value, product, commission_percentage, commission_amount, commission_payment_id, notes, closed_at,
        user_id,
        user:profiles!sales_user_id_fkey(id, full_name, email, color_bg, color_text, color_name)
      `)
      .is('deleted_at', null)
      .order('closed_at', { ascending: false }),

    supabase
      .from('commission_payments')
      .select(`
        id, seller_id, paid_by, period_start, period_end,
        total_amount, sales_count, notes, paid_at, created_at,
        seller:profiles!commission_payments_seller_id_fkey(id, full_name, email, color_bg, color_text),
        payer:profiles!commission_payments_paid_by_fkey(id, full_name, email)
      `)
      .order('paid_at', { ascending: false }),
  ])

  return (
    <div className="space-y-6">
      <RealtimeRefresher tables={['sales', 'commission_payments']} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Percent className="w-6 h-6 text-primary" />
            Comisiones
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona las ganancias de cada vendedora y registra los pagos realizados
          </p>
        </div>
      </div>

      <CommissionsAdmin
        sellers={(sellers ?? []) as any[]}
        sales={(sales ?? []) as any[]}
        payments={(payments ?? []) as any[]}
      />
    </div>
  )
}
