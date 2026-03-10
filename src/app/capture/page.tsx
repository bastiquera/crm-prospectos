'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, CheckCircle2, User, Mail, Phone, ArrowRight } from 'lucide-react'
import { LEAD_SOURCE_LABELS, type LeadSource } from '@/types'

const schema = z.object({
  name:   z.string().min(2, 'Ingresa tu nombre completo'),
  email:  z.string().email('Email inválido'),
  phone:  z.string().min(8, 'Teléfono inválido'),
  source: z.enum(['instagram','tiktok','website','paid_ad','referral','other']),
})

type FormData = z.infer<typeof schema>

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '56942534098'

export default function CapturePage() {
  const supabase = createClient()
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { source: 'website' },
  })

  const sourceValue = watch('source')

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      // Get initial pipeline stage
      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('is_initial', true)
        .single()

      await supabase.from('leads').insert({
        name:     data.name,
        email:    data.email,
        phone:    data.phone,
        source:   data.source,
        status:   'available',
        stage_id: stages?.id ?? null,
      })

      setSubmitted(true)

      // Redirect to WhatsApp after 1.5s
      setTimeout(() => {
        const message = encodeURIComponent(
          `Hola! Acabo de registrarme y me gustaría obtener más información.`
        )
        window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`
      }, 1500)
    } catch {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto border border-green-500/30">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">¡Registro exitoso!</h2>
            <p className="text-slate-400">Te estamos redirigiendo a WhatsApp para atenderte de inmediato...</p>
          </div>
          <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center space-y-2 mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/20 text-primary border border-primary/30 rounded-full px-4 py-1.5 text-xs font-medium mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Atención inmediata vía WhatsApp
            </div>
            <h1 className="text-3xl font-bold text-white">Contáctanos</h1>
            <p className="text-slate-400 text-sm">Completa tus datos y un asesor te contactará al instante</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Nombre completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  {...register('name')}
                  placeholder="Juan García"
                  className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-primary focus:bg-white/8"
                />
              </div>
              {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="juan@email.com"
                  className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-primary"
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Teléfono / WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  {...register('phone')}
                  type="tel"
                  placeholder="+56 9 1234 5678"
                  className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-primary"
                />
              </div>
              {errors.phone && <p className="text-red-400 text-xs">{errors.phone.message}</p>}
            </div>

            {/* Source */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">¿Cómo nos conociste?</Label>
              <Select
                value={sourceValue}
                onValueChange={(v) => setValue('source', v as LeadSource)}
              >
                <SelectTrigger className="h-11 bg-white/5 border-white/10 text-white focus:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-base rounded-xl transition-all group"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
              ) : (
                <>
                  Quiero ser contactado
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </Button>

            <p className="text-center text-slate-500 text-xs">
              Al enviar aceptas que nos comuniquemos contigo por WhatsApp.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
