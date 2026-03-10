'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Phone, MessageCircle, Mail, Plus, Loader2,
  Clock, User, MapPin, Calendar, Trophy, ArrowLeft
} from 'lucide-react'
import { formatDistanceToNow, formatDate, formatCurrency, cn } from '@/lib/utils'
import { LEAD_SOURCE_LABELS, type Lead, type Profile, type FollowUp, type ContactType } from '@/types'
import { CloseSaleDialog } from '@/components/pipeline/CloseSaleDialog'
import Link from 'next/link'

const followUpSchema = z.object({
  contact_type: z.enum(['call','whatsapp','email','meeting','note']),
  note:         z.string().min(3, 'Agrega una nota'),
  next_action:  z.string().optional(),
})
type FollowUpData = z.infer<typeof followUpSchema>

const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  call:     '📞 Llamada',
  whatsapp: '💬 WhatsApp',
  email:    '✉️ Email',
  meeting:  '🤝 Reunión',
  note:     '📝 Nota',
}

interface Props {
  lead: Lead
  profile: Profile
  followUps: FollowUp[]
}

export function LeadDetailView({ lead, profile, followUps: initialFollowUps }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [followUps, setFollowUps] = useState<FollowUp[]>(initialFollowUps)
  const [closeSaleOpen, setCloseSaleOpen] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [estimatedValue, setEstimatedValue] = useState(lead.estimated_value?.toString() ?? '')
  const [savingValue, setSavingValue] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FollowUpData>({
    resolver: zodResolver(followUpSchema),
    defaultValues: { contact_type: 'note' },
  })

  const contactType = watch('contact_type')

  async function onAddFollowUp(data: FollowUpData) {
    setSavingNote(true)
    const { data: newFollowUp } = await supabase
      .from('follow_ups')
      .insert({
        lead_id:      lead.id,
        user_id:      profile.id,
        contact_type: data.contact_type,
        note:         data.note,
        next_action:  data.next_action ?? null,
      })
      .select('*, user:profiles(*)')
      .single()

    if (newFollowUp) {
      setFollowUps((prev) => [newFollowUp as FollowUp, ...prev])
      // Update last contact
      await supabase.from('leads').update({
        last_contact_at: new Date().toISOString(),
        next_action:     data.next_action ?? null,
      }).eq('id', lead.id)
    }
    reset()
    setSavingNote(false)
  }

  async function saveEstimatedValue() {
    setSavingValue(true)
    await supabase.from('leads').update({
      estimated_value: parseFloat(estimatedValue) || null,
    }).eq('id', lead.id)
    setSavingValue(false)
    router.refresh()
  }

  const phone = lead.phone.replace(/\D/g, '')

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back */}
      <Link
        href="/seller/pipeline"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al pipeline
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Contact card */}
          <div className="bg-white rounded-xl border border-border/60 shadow-card p-5">
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0"
                style={{ backgroundColor: profile.color_light, color: profile.color_bg }}
              >
                {lead.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-bold text-foreground text-lg leading-tight">{lead.name}</h2>
                <Badge variant="secondary" className="text-xs mt-1">
                  {LEAD_SOURCE_LABELS[lead.source]}
                </Badge>
              </div>
            </div>

            <div className="space-y-2.5">
              <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-slate-100">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">{lead.email}</span>
              </a>
              <a href={`tel:${lead.phone}`} className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-slate-100">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                {lead.phone}
              </a>
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                {formatDate(lead.created_at)}
              </div>
            </div>

            {/* Quick contact */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 py-2.5 rounded-lg bg-green-50 hover:bg-green-100 border border-green-200 transition-colors">
                <MessageCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-700 font-medium">WA</span>
              </a>
              <a href={`tel:${lead.phone}`}
                className="flex flex-col items-center gap-1 py-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors">
                <Phone className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-700 font-medium">Llamar</span>
              </a>
              <a href={`mailto:${lead.email}`}
                className="flex flex-col items-center gap-1 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-border transition-colors">
                <Mail className="w-4 h-4 text-slate-600" />
                <span className="text-xs text-slate-600 font-medium">Email</span>
              </a>
            </div>
          </div>

          {/* Deal info */}
          <div className="bg-white rounded-xl border border-border/60 shadow-card p-5 space-y-3">
            <h3 className="font-semibold text-sm text-foreground">Datos del negocio</h3>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Valor estimado (CLP)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  placeholder="0"
                  className="h-9 text-sm"
                />
                <Button size="sm" variant="outline" className="h-9 px-3" onClick={saveEstimatedValue} disabled={savingValue}>
                  {savingValue ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'OK'}
                </Button>
              </div>
            </div>

            {lead.stage && (
              <div className="flex items-center justify-between py-2 border-t border-border/40">
                <span className="text-xs text-muted-foreground">Etapa</span>
                <Badge variant="outline" className="text-xs">{lead.stage.name}</Badge>
              </div>
            )}
            {lead.last_contact_at && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Último contacto</span>
                <span className="text-xs font-medium">{formatDistanceToNow(lead.last_contact_at)}</span>
              </div>
            )}
          </div>

          {/* Close sale */}
          <Button
            onClick={() => setCloseSaleOpen(true)}
            className="w-full h-10 bg-yellow-500 hover:bg-yellow-600 text-white font-medium"
          >
            <Trophy className="w-4 h-4 mr-2" /> Cerrar venta
          </Button>
        </div>

        {/* Right column — activity */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add follow up */}
          <div className="bg-white rounded-xl border border-border/60 shadow-card p-5">
            <h3 className="font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Registrar actividad
            </h3>
            <form onSubmit={handleSubmit(onAddFollowUp)} className="space-y-3">
              <div>
                <Select value={contactType} onValueChange={(v) => setValue('contact_type', v as ContactType)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTACT_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                {...register('note')}
                placeholder="¿Qué ocurrió en este contacto?"
                className="resize-none h-20 text-sm"
              />
              {errors.note && <p className="text-red-500 text-xs">{errors.note.message}</p>}

              <Input
                {...register('next_action')}
                placeholder="Próxima acción (opcional)"
                className="h-9 text-sm"
              />

              <Button type="submit" disabled={savingNote} size="sm" className="w-full h-9 bg-primary hover:bg-primary/90 text-white">
                {savingNote ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Guardando...</> : 'Registrar actividad'}
              </Button>
            </form>
          </div>

          {/* Follow up history */}
          <div className="bg-white rounded-xl border border-border/60 shadow-card">
            <div className="px-5 py-4 border-b border-border/40">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Historial de contacto
                <span className="text-xs text-muted-foreground font-normal ml-1">({followUps.length})</span>
              </h3>
            </div>
            <div className="divide-y divide-border/40">
              {followUps.length === 0 ? (
                <div className="px-5 py-8 text-center text-muted-foreground text-sm">
                  Sin actividad registrada aún
                </div>
              ) : (
                followUps.map((fu) => (
                  <div key={fu.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className="text-base flex-shrink-0 mt-0.5">
                        {CONTACT_TYPE_LABELS[fu.contact_type].split(' ')[0]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-relaxed">{fu.note}</p>
                        {fu.next_action && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <ArrowLeft className="w-3 h-3 rotate-180 text-primary flex-shrink-0" />
                            <p className="text-xs text-primary font-medium">{fu.next_action}</p>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(fu.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
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
