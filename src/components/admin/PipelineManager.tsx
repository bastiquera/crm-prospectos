'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, GripVertical, Trophy, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PipelineStage } from '@/types'

interface Props { stages: PipelineStage[] }

export function PipelineManager({ stages: initialStages }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [stages, setStages] = useState<PipelineStage[]>(initialStages)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function addStage() {
    if (!newName.trim()) return
    setAdding(true)
    const maxOrder = Math.max(...stages.map((s) => s.order_index), 0)

    const { data } = await supabase
      .from('pipeline_stages')
      .insert({ name: newName.trim(), order_index: maxOrder + 1 })
      .select()
      .single()

    if (data) setStages((prev) => [...prev, data as PipelineStage])
    setNewName('')
    setAdding(false)
    router.refresh()
  }

  async function deleteStage(id: string) {
    setDeletingId(id)
    await supabase.from('pipeline_stages').delete().eq('id', id)
    setStages((prev) => prev.filter((s) => s.id !== id))
    setDeletingId(null)
    router.refresh()
  }

  return (
    <div className="max-w-lg space-y-4">
      {/* Stages list */}
      <div className="bg-white rounded-xl border border-border/60 shadow-card divide-y divide-border/40">
        {stages.map((stage) => (
          <div key={stage.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/50 transition-colors">
            <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
            <div className="flex-1 flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{stage.name}</span>
              {stage.is_initial && (
                <Badge variant="secondary" className="text-xs">Inicial</Badge>
              )}
              {stage.is_closed_won && (
                <Badge className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100">
                  <Trophy className="w-3 h-3 mr-1" />Cierre
                </Badge>
              )}
              {stage.is_closed_lost && (
                <Badge variant="secondary" className="text-xs bg-red-50 text-red-600 border-red-200">Perdido</Badge>
              )}
            </div>
            {!stage.is_initial && !stage.is_closed_won && !stage.is_closed_lost && (
              <button
                onClick={() => deleteStage(stage.id)}
                disabled={deletingId === stage.id}
                className="text-muted-foreground/50 hover:text-red-500 transition-colors"
              >
                {deletingId === stage.id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />
                }
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add new stage */}
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nueva etapa..."
          className="h-10 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && addStage()}
        />
        <Button onClick={addStage} disabled={adding || !newName.trim()} className="h-10 bg-primary hover:bg-primary/90 text-white px-4">
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Las etapas marcadas como <strong>Inicial</strong>, <strong>Cierre</strong> y <strong>Perdido</strong> no se pueden eliminar.
      </p>
    </div>
  )
}
