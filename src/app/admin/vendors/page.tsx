import { createClient } from '@/lib/supabase/server'
import { VendorsManager } from '@/components/admin/VendorsManager'
import type { Profile } from '@/types'

export const dynamic = 'force-dynamic'

export default async function AdminVendorsPage() {
  const supabase = await createClient()

  const { data: sellers } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'seller')
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vendedores</h1>
        <p className="text-muted-foreground text-sm mt-1">Crea y gestiona el equipo de vendedores</p>
      </div>
      <VendorsManager sellers={(sellers ?? []) as Profile[]} />
    </div>
  )
}
