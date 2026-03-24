import { createClient } from '@/lib/supabase/server'
import { SystemCostManager } from '@/components/admin/SystemCostManager'
import { DollarSign } from 'lucide-react'
import type { SystemCostRate, Sale } from '@/types'

export const dynamic = 'force-dynamic'

export default async function SystemCostPage() {
  const supabase = await createClient()

  const [{ data: rates }, { data: sales }] = await Promise.all([
    supabase
      .from('system_cost_rates')
      .select('id, rate, effective_from, created_by, notes, created_at')
      .order('effective_from', { ascending: false }),

    supabase
      .from('sales')
      .select('id, closed_at')
      .is('deleted_at', null)
      .order('closed_at', { ascending: false }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-primary" />
          Costo de uso
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Controla el costo del sistema en base a las ventas generadas
        </p>
      </div>

      <SystemCostManager
        rates={(rates ?? []) as SystemCostRate[]}
        sales={(sales ?? []) as Pick<Sale, 'id' | 'closed_at'>[]}
      />
    </div>
  )
}
