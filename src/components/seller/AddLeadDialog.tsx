'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, UserPlus } from 'lucide-react'
import { LEAD_SOURCE_LABELS, type Profile, type LeadSource } from '@/types'

const schema = z.object({
  name:   z.string().min(2, 'Ingresa el nombre completo'),
  email:  z.string().email('Email inválido'),
  phone:  z.string().min(6, 'Teléfono requerido'),
  source: z.enum(['instagram','tiktok','website','paid_ad','referral','other']),
  notes:  z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  profile: Profile
}

export function AddLeadDialog({ open, onOpenChange, profile }: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { source: 'other' },
  })

  const source = watch('source')

  async function onSubmit(data: FormData) {
    setLoading(true)
    setError(null)

    // Check duplicate by email
    const { data: existing } = await supabase
      .from('leads')
      .select('id, name')
      .eq('email', data.email.toLowerCase().trim())
      .limit(1)

    if (existing && existing.length > 0) {
      setError(`Ya existe un prospecto con ese email: ${existing[0].name}`)
      setLoading(false)
      return
    }

    // Get first active stage (non-initial)
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('is_initial', false)
      .eq('is_closed_won', false)
      .eq('is_closed_lost', false)
      .order('order_index', { ascending: true })
      .limit(1)

    const { error: insertError } = await supabase.from('leads').insert({
      name:        data.name.trim(),
      email:       data.email.toLowerCase().trim(),
      phone:       data.phone.trim(),
      source:      data.source,
      notes:       data.notes?.trim() || null,
      status:      'assigned',
      assigned_to: profile.id,
      taken_at:    new Date().toISOString(),
      stage_id:    stages?.[0]?.id ?? null,
    })

    if (insertError) {
      setError('Error al registrar el prospecto. Intenta de nuevo.')
      setLoading(false)
      return
    }

    reset()
    setLoading(false)
    onOpenChange(false)
    router.push('/seller/pipeline')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-primary" />
            </div>
            Agregar prospecto manualmente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Nombre completo *</Label>
            <Input
              {...register('name')}
              placeholder="ej. María González"
              className="h-10 text-sm"
              autoFocus
            />
            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Email *</Label>
              <Input
                {...register('email')}
                type="email"
                placeholder="correo@ejemplo.com"
                className="h-10 text-sm"
              />
              {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Teléfono *</Label>
              <Input
                {...register('phone')}
                placeholder="+56 9 1234 5678"
                className="h-10 text-sm"
              />
              {errors.phone && <p className="text-red-500 text-xs">{errors.phone.message}</p>}
            </div>
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Fuente del prospecto</Label>
            <Select
              value={source}
              onValueChange={(v: string | null) => { if (v) setValue('source', v as LeadSource) }}
            >
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LEAD_SOURCE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Notas iniciales (opcional)</Label>
            <Input
              {...register('notes')}
              placeholder="Contexto del prospecto..."
              className="h-10 text-sm"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-[13px] rounded-lg px-3 py-2.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => { reset(); onOpenChange(false) }}
              className="flex-1 h-10"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-10 bg-primary hover:bg-primary/90 text-white"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Guardando...</>
                : <><UserPlus className="w-4 h-4 mr-1.5" />Agregar prospecto</>
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
