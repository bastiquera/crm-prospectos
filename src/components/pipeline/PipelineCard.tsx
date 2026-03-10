'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Phone, MessageCircle, Mail, ChevronDown, ArrowRight, Trophy, ExternalLink } from 'lucide-react'
import { formatDistanceToNow, formatCurrency, cn } from '@/lib/utils'
import { CloseSaleDialog } from './CloseSaleDialog'
import type { Lead, PipelineStage, Profile } from '@/types'

interface Props {
  lead: Lead
  stages: PipelineStage[]
  currentStageIdx: number
  profile: Profile
  onMoveStage: (leadId: string, stageId: string) => void
}

export function PipelineCard({ lead, stages, currentStageIdx, profile, onMoveStage }: Props) {
  const [closeSaleOpen, setCloseSaleOpen] = useState(false)

  const phone = lead.phone.replace(/\D/g, '')
  const waUrl = `https://wa.me/${phone}`
  const telUrl = `tel:${lead.phone}`
  const mailUrl = `mailto:${lead.email}`

  return (
    <div
      className="bg-white rounded-xl border border-border/60 shadow-card hover:shadow-card-hover transition-all"
      style={{ borderLeftWidth: 3, borderLeftColor: profile.color_bg }}
    >
      {/* Header */}
      <div className="px-4 pt-3.5 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground text-sm leading-tight truncate">{lead.name}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(lead.taken_at ?? lead.created_at)}</p>
          </div>
          {lead.estimated_value && (
            <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 flex-shrink-0">
              {formatCurrency(lead.estimated_value)}
            </span>
          )}
        </div>
      </div>

      {/* Contact actions */}
      <div className="px-3 pb-3 flex items-center gap-1.5">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 text-xs font-medium transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          WA
        </a>
        <a
          href={telUrl}
          className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-medium transition-colors"
        >
          <Phone className="w-3.5 h-3.5" />
          Llamar
        </a>
        <a
          href={mailUrl}
          className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-border text-slate-600 text-xs font-medium transition-colors"
        >
          <Mail className="w-3.5 h-3.5" />
          Email
        </a>
      </div>

      {/* Footer actions */}
      <div className="px-3 pb-3 flex items-center gap-1.5 border-t border-border/40 pt-2.5">
        <Link
          href={`/seller/lead/${lead.id}`}
          className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-border text-slate-600 text-xs font-medium transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Ver
        </Link>

        {/* Move stage */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 border border-border text-slate-600 text-xs font-medium transition-colors">
              <ArrowRight className="w-3 h-3" />
              Mover
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {stages.map((stage, idx) => (
              <DropdownMenuItem
                key={stage.id}
                disabled={stage.id === lead.stage_id}
                onClick={() => {
                  if (stage.is_closed_won) {
                    setCloseSaleOpen(true)
                  } else {
                    onMoveStage(lead.id, stage.id)
                  }
                }}
                className={cn('text-sm', stage.id === lead.stage_id && 'opacity-40')}
              >
                {stage.is_closed_won && <Trophy className="w-3.5 h-3.5 mr-1.5 text-yellow-500" />}
                {stage.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Close sale shortcut */}
        <button
          onClick={() => setCloseSaleOpen(true)}
          className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-yellow-700 text-xs font-medium transition-colors"
        >
          <Trophy className="w-3 h-3" />
          Cerrar
        </button>
      </div>

      <CloseSaleDialog
        open={closeSaleOpen}
        onOpenChange={setCloseSaleOpen}
        lead={lead}
        profile={profile}
      />
    </div>
  )
}
