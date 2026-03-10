'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LeadCard } from './LeadCard'
import { Inbox, Loader2, Zap } from 'lucide-react'
import type { Lead, Profile } from '@/types'

interface Props {
  profile: Profile
}

export function AvailableLeadsPanel({ profile }: Props) {
  const supabase = createClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [takingId, setTakingId] = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    const { data } = await supabase
      .from('leads')
      .select('*, stage:pipeline_stages(*)')
      .eq('status', 'available')
      .order('created_at', { ascending: true })

    setLeads((data as Lead[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchLeads()

    // Real-time subscription
    const channel = supabase
      .channel('available-leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => { fetchLeads() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchLeads, supabase])

  async function takeLead(leadId: string) {
    if (takingId) return
    setTakingId(leadId)

    // Get first non-initial stage for the seller's pipeline
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('is_initial', false)
      .eq('is_closed_won', false)
      .eq('is_closed_lost', false)
      .order('order_index', { ascending: true })
      .limit(1)

    const { error } = await supabase
      .from('leads')
      .update({
        status:      'assigned',
        assigned_to: profile.id,
        taken_at:    new Date().toISOString(),
        stage_id:    stages?.[0]?.id ?? null,
      })
      .eq('id', leadId)
      .eq('status', 'available') // optimistic lock

    if (!error) {
      setLeads((prev) => prev.filter((l) => l.id !== leadId))
    }
    setTakingId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Inbox className="w-7 h-7 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-foreground">Sin leads disponibles</p>
          <p className="text-sm text-muted-foreground mt-1">Los nuevos leads aparecerán aquí automáticamente</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-full px-3 py-1.5">
          <Zap className="w-3 h-3" />
          Actualizando en tiempo real
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            En vivo
          </span>
          <span className="text-sm text-muted-foreground">
            {leads.length} lead{leads.length !== 1 ? 's' : ''} disponible{leads.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Lead cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onTake={() => takeLead(lead.id)}
            isTaking={takingId === lead.id}
          />
        ))}
      </div>
    </div>
  )
}
