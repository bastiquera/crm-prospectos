import { createClient } from '@/lib/supabase/server'
import { PipelineManager } from '@/components/admin/PipelineManager'
import type { PipelineStage } from '@/types'

export const dynamic = 'force-dynamic'

export default async function AdminPipelinePage() {
  const supabase = await createClient()

  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('*')
    .order('order_index', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestión del Pipeline</h1>
        <p className="text-muted-foreground text-sm mt-1">Configura las etapas del proceso de ventas</p>
      </div>
      <PipelineManager stages={(stages ?? []) as PipelineStage[]} />
    </div>
  )
}
