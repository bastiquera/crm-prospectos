'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckSquare, Square, Loader2 } from 'lucide-react'
import type { ChecklistItem, LeadChecklistCompletion } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  leadId: string
  userId: string
  items: ChecklistItem[]
  completions: LeadChecklistCompletion[]
}

export function LeadChecklist({ leadId, userId, items, completions: initialCompletions }: Props) {
  const supabase = createClient()
  const [completions, setCompletions] = useState<LeadChecklistCompletion[]>(initialCompletions)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  if (items.length === 0) return null

  const completedIds = new Set(completions.map((c) => c.checklist_item_id))
  const completedCount = items.filter((i) => completedIds.has(i.id)).length

  async function toggleItem(itemId: string) {
    setTogglingId(itemId)
    const isCompleted = completedIds.has(itemId)

    if (isCompleted) {
      await supabase
        .from('lead_checklist_completions')
        .delete()
        .eq('lead_id', leadId)
        .eq('checklist_item_id', itemId)
      setCompletions((prev) => prev.filter((c) => c.checklist_item_id !== itemId))
    } else {
      const { data } = await supabase
        .from('lead_checklist_completions')
        .insert({ lead_id: leadId, checklist_item_id: itemId, completed_by: userId })
        .select()
        .single()
      if (data) setCompletions((prev) => [...prev, data as LeadChecklistCompletion])
    }

    setTogglingId(null)
  }

  return (
    <div className="bg-white rounded-xl border border-border/60 shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-primary" />
          Checklist
        </h3>
        <span className="text-xs text-muted-foreground font-medium">
          {completedCount}/{items.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${items.length > 0 ? (completedCount / items.length) * 100 : 0}%` }}
        />
      </div>

      <div className="space-y-1">
        {items.map((item) => {
          const done = completedIds.has(item.id)
          const toggling = togglingId === item.id
          return (
            <button
              key={item.id}
              onClick={() => toggleItem(item.id)}
              disabled={toggling}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all',
                done ? 'bg-green-50 hover:bg-green-100/70' : 'hover:bg-slate-50'
              )}
            >
              {toggling ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
              ) : done ? (
                <CheckSquare className="w-4 h-4 text-green-600 flex-shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-300 flex-shrink-0" />
              )}
              <span className={cn(
                'text-sm transition-colors',
                done ? 'line-through text-muted-foreground' : 'text-foreground'
              )}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
