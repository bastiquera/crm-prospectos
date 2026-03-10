'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Phone, Mail, Clock, Zap } from 'lucide-react'
import { LEAD_SOURCE_LABELS, type Lead } from '@/types'
import { formatDistanceToNow } from '@/lib/utils'

interface Props {
  lead: Lead
  onTake?: () => void
  isTaking?: boolean
  showVendor?: boolean
}

const SOURCE_ICONS: Record<string, string> = {
  instagram: '📸',
  tiktok:    '🎵',
  website:   '🌐',
  paid_ad:   '📢',
  referral:  '👥',
  other:     '📌',
}

export function LeadCard({ lead, onTake, isTaking, showVendor }: Props) {
  return (
    <div className="bg-white rounded-xl border border-border/60 shadow-card hover:shadow-card-hover transition-all group">
      {/* Top strip */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="text-base">{SOURCE_ICONS[lead.source] ?? '📌'}</span>
          <Badge variant="secondary" className="text-xs font-medium">
            {LEAD_SOURCE_LABELS[lead.source]}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(lead.created_at)}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground text-base leading-tight">{lead.name}</h3>
          {showVendor && lead.assignee && (
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: lead.assignee.color_bg }}
              />
              <span className="text-xs text-muted-foreground">{lead.assignee.full_name}</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{lead.phone}</span>
          </div>
        </div>
      </div>

      {/* Action */}
      {onTake && (
        <div className="px-4 pb-4">
          <Button
            onClick={onTake}
            disabled={isTaking}
            className="w-full h-9 bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-all"
          >
            {isTaking ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Tomando...</>
            ) : (
              <><Zap className="w-3.5 h-3.5 mr-1.5" /> Tomar lead</>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
