import { createClient } from '@/lib/supabase/server'
import { AvailableLeadsPanel } from '@/components/leads/AvailableLeadsPanel'
import type { Profile } from '@/types'

export const dynamic = 'force-dynamic'

export default async function SellerHomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Leads disponibles</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Toma un lead para asignártelo. El primero que lo tome se lo queda.
        </p>
      </div>
      <AvailableLeadsPanel profile={profile as Profile} />
    </div>
  )
}
