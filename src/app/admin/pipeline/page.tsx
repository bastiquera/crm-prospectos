import { createClient } from '@/lib/supabase/server'
import { PipelineManager } from '@/components/admin/PipelineManager'
import type { PipelineStage, ChecklistItem, Course } from '@/types'

export const dynamic = 'force-dynamic'

export default async function AdminPipelinePage() {
  const supabase = await createClient()

  const [{ data: stages }, { data: checklistItems }, { data: courses }] = await Promise.all([
    supabase.from('pipeline_stages').select('*').order('order_index', { ascending: true }),
    supabase.from('checklist_items').select('*').order('order_index', { ascending: true }),
    supabase.from('courses').select('*').order('order_index', { ascending: true }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestión del Pipeline</h1>
        <p className="text-muted-foreground text-sm mt-1">Configura las etapas del proceso de ventas</p>
      </div>
      <PipelineManager
        stages={(stages ?? []) as PipelineStage[]}
        checklistItems={(checklistItems ?? []) as ChecklistItem[]}
        courses={(courses ?? []) as Course[]}
      />
    </div>
  )
}
