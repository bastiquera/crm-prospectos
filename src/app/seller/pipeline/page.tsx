import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/pipeline/KanbanBoard'
import type { Lead, PipelineStage, Profile } from '@/types'

export const dynamic = 'force-dynamic'

export default async function SellerPipelinePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: stages }, { data: leads }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('pipeline_stages')
      .select('*')
      .eq('is_initial', false)
      .order('order_index', { ascending: true }),
    supabase.from('leads')
      .select('*, stage:pipeline_stages(*)')
      .eq('assigned_to', user!.id)
      .eq('status', 'assigned')
      .order('taken_at', { ascending: false }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi Pipeline</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestiona tus prospectos y muévelos entre etapas
        </p>
      </div>
      <KanbanBoard
        stages={(stages ?? []) as PipelineStage[]}
        leads={(leads ?? []) as Lead[]}
        profile={profile as Profile}
      />
    </div>
  )
}
