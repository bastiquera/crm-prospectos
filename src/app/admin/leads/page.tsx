import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow, formatCurrency } from '@/lib/utils'
import { LEAD_SOURCE_LABELS, type Lead } from '@/types'
import { Database, Circle } from 'lucide-react'
import { RealtimeRefresher } from '@/components/RealtimeRefresher'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG = {
  available: { label: 'Disponible', class: 'bg-blue-50 text-blue-700 border-blue-200' },
  assigned:  { label: 'En proceso', class: 'bg-orange-50 text-orange-700 border-orange-200' },
  closed:    { label: 'Cerrado',    class: 'bg-green-50 text-green-700 border-green-200' },
  lost:      { label: 'Perdido',    class: 'bg-red-50 text-red-700 border-red-200' },
}

export default async function AdminLeadsPage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('*, stage:pipeline_stages(*), assignee:profiles!leads_assigned_to_fkey(*)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <RealtimeRefresher tables={['leads']} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Base de leads</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {leads?.length ?? 0} leads registrados en total
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border/60 shadow-card">
        <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Todos los leads</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                {['Nombre','Email','Teléfono','Fuente','Estado','Vendedor','Etapa','Creado'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {(leads ?? []).map((lead: Lead) => {
                const statusCfg = STATUS_CONFIG[lead.status]
                return (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{lead.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.email}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{lead.phone}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs">{LEAD_SOURCE_LABELS[lead.source]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusCfg.class}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: lead.assignee.color_bg }} />
                          <span className="text-xs whitespace-nowrap">{lead.assignee.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {lead.stage?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(lead.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
