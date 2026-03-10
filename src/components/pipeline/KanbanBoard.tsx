'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PipelineCard } from './PipelineCard'
import type { Lead, PipelineStage, Profile } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  stages: PipelineStage[]
  leads: Lead[]
  profile: Profile
}

export function KanbanBoard({ stages, leads: initialLeads, profile }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const router = useRouter()
  const supabase = createClient()

  const getLeadsForStage = useCallback(
    (stageId: string) => leads.filter((l) => l.stage_id === stageId),
    [leads]
  )

  async function moveToStage(leadId: string, stageId: string) {
    setLeads((prev) =>
      prev.map((l) => l.id === leadId ? { ...l, stage_id: stageId } : l)
    )

    await supabase.from('leads').update({ stage_id: stageId }).eq('id', leadId)
    router.refresh()
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
      {stages.map((stage, idx) => {
        const stageLeads = getLeadsForStage(stage.id)
        const isWon  = stage.is_closed_won
        const isLost = stage.is_closed_lost

        return (
          <div
            key={stage.id}
            className="flex-shrink-0 w-72"
          >
            {/* Column header */}
            <div className={cn(
              'rounded-xl px-4 py-3 mb-3 flex items-center justify-between',
              isWon  ? 'bg-green-50 border border-green-200' :
              isLost ? 'bg-red-50 border border-red-200' :
              'bg-slate-50 border border-border/60'
            )}>
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  isWon  ? 'bg-green-500' :
                  isLost ? 'bg-red-400' :
                  'bg-slate-400'
                )} />
                <span className={cn(
                  'text-sm font-semibold',
                  isWon  ? 'text-green-800' :
                  isLost ? 'text-red-700' :
                  'text-foreground'
                )}>
                  {stage.name}
                </span>
              </div>
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                isWon  ? 'bg-green-100 text-green-700' :
                isLost ? 'bg-red-100 text-red-600' :
                'bg-slate-100 text-muted-foreground'
              )}>
                {stageLeads.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-3 min-h-[200px]">
              {stageLeads.map((lead) => (
                <PipelineCard
                  key={lead.id}
                  lead={lead}
                  stages={stages}
                  currentStageIdx={idx}
                  profile={profile}
                  onMoveStage={moveToStage}
                />
              ))}
              {stageLeads.length === 0 && (
                <div className="h-24 rounded-xl border-2 border-dashed border-border/40 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Sin prospectos</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
