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
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Trophy } from 'lucide-react'
import type { Lead, Profile } from '@/types'

const schema = z.object({
  value:   z.coerce.number().positive('Ingresa el valor de la venta'),
  product: z.string().min(2, 'Describe el producto o servicio'),
  notes:   z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  lead: Lead
  profile: Profile
}

export function CloseSaleDialog({ open, onOpenChange, lead, profile }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)

    // Get closed-won stage
    const { data: closedStage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('is_closed_won', true)
      .single()

    // Update lead
    await supabase.from('leads').update({
      status:    'closed',
      stage_id:  closedStage?.id ?? lead.stage_id,
      closed_at: new Date().toISOString(),
      estimated_value: data.value,
    }).eq('id', lead.id)

    // Register sale
    await supabase.from('sales').insert({
      lead_id:   lead.id,
      user_id:   profile.id,
      value:     data.value,
      product:   data.product,
      notes:     data.notes ?? null,
      closed_at: new Date().toISOString(),
    })

    setLoading(false)
    reset()
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-yellow-600" />
            </div>
            Registrar venta cerrada
          </DialogTitle>
        </DialogHeader>

        <div className="mt-1 p-3 bg-slate-50 rounded-lg border border-border/60">
          <p className="text-sm font-medium text-foreground">{lead.name}</p>
          <p className="text-xs text-muted-foreground">{lead.email} · {lead.phone}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Valor de la venta (CLP)</Label>
            <Input
              {...register('value')}
              type="number"
              placeholder="ej. 150000"
              className="h-10"
            />
            {errors.value && <p className="text-red-500 text-xs">{errors.value.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Producto / Servicio</Label>
            <Input
              {...register('product')}
              placeholder="ej. Plan mensual premium"
              className="h-10"
            />
            {errors.product && <p className="text-red-500 text-xs">{errors.product.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Notas (opcional)</Label>
            <Textarea
              {...register('notes')}
              placeholder="Observaciones del cierre..."
              className="resize-none h-20 text-sm"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-10"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-10 bg-yellow-500 hover:bg-yellow-600 text-white font-medium"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Guardando...</>
              ) : (
                <><Trophy className="w-4 h-4 mr-1.5" />Cerrar venta</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
