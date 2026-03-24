'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, CheckCircle2, User, Mail, Phone, ArrowRight, ChevronDown, Shield, Clock, Star } from 'lucide-react'
import { LEAD_SOURCE_LABELS, type LeadSource, type Course } from '@/types'

const schema = z.object({
  name:      z.string().min(2, 'Ingresa tu nombre'),
  email:     z.string().min(1, 'Ingresa tu email'),
  phone:     z.string().min(6, 'Ingresa tu teléfono'),
  source:    z.enum(['instagram','tiktok','website','paid_ad','referral','other']),
  course_id: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function CapturePage() {
  const supabase = createClient()
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])

  useEffect(() => {
    supabase.from('courses').select('*').eq('is_active', true).order('order_index').then(({ data }) => {
      if (data) setCourses(data as Course[])
    })
  }, [])


  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { source: 'website' },
  })

  const sourceValue = watch('source')
  const courseValue = watch('course_id')


  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('is_initial', true)
        .single()

      await supabase.from('leads').insert({
        name:      data.name,
        email:     data.email,
        phone:     data.phone,
        source:    data.source,
        course_id: data.course_id ?? null,
        status:    'available',
        stage_id:  stages?.id ?? null,
      })

      setSubmitted(true)
    } catch {
      setLoading(false)
    }
  }

  /* ── Pantalla de éxito ─────────────────────────────────────────── */
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center p-6 pt-14">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-5">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
              <div className="relative w-24 h-24 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-white">¡Listo! Ya recibimos tu solicitud</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                En breve nos pondremos en contacto contigo para enviarte toda la información que necesitas.
                Mientras tanto pregunta lo que desees con nuestro asistente virtual mientras te contactamos.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 text-primary/80">
            <span className="text-xs font-medium tracking-wide uppercase">Habla con nuestro asistente</span>
            <ChevronDown className="w-6 h-6 animate-bounce" />
          </div>

          <iframe
            src="https://chatbotbackend-production-a109.up.railway.app/embed?color=1B3A6B&bot=Asistente"
            style={{ width: '100%', height: '520px', border: 'none', borderRadius: '16px' }}
            title="Asistente virtual"
          />

          <div className="pb-10">
            <a
              href="https://capacitacionyseguridad.com/"
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all"
            >
              ← Volver a la página principal
            </a>
          </div>
        </div>
      </div>
    )
  }

  /* ── Formulario ────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Badge urgencia */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full px-4 py-1.5 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Cupos limitados — Respuesta en menos de 24 horas
          </div>
        </div>

        {/* Título fuera del card para mayor impacto */}
        <div className="text-center mb-6 px-2">
          <h1 className="text-3xl font-extrabold text-white leading-tight mb-2">
            Recibe la información<br />
            <span className="text-primary">en pocos minutos</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Completa el formulario y te enviamos la información
          </p>
        </div>

        {/* Card formulario */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Nombre */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm font-medium">Nombre</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  {...register('name')}
                  placeholder="Juan García"
                  className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-primary"
                />
              </div>
              {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
            </div>

            {/* Teléfono — primero para WhatsApp (mayor conversión) */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm font-medium">
                WhatsApp
                <span className="ml-2 text-xs text-primary font-normal">← Te contactamos por aquí</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  {...register('phone')}
                  placeholder="+56 9 1234 5678"
                  className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-primary"
                />
              </div>
              {errors.phone && <p className="text-red-400 text-xs">{errors.phone.message}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  {...register('email')}
                  placeholder="juan@email.com"
                  className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-primary"
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
            </div>

            {/* Curso de interés */}
            {courses.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm font-medium">Curso de interés</Label>
                <Select
                  value={courseValue ?? ''}
                  onValueChange={(v) => setValue('course_id', v === 'none' ? undefined : (v || undefined))}
                >
                  <SelectTrigger className="h-11 bg-white/5 border-white/10 text-white focus:border-primary">
                    {courseValue && courseValue !== 'none'
                      ? <span>{courses.find(c => c.id === courseValue)?.name ?? 'Selecciona un curso (opcional)'}</span>
                      : <span className="text-slate-500">Selecciona un curso (opcional)</span>
                    }
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin preferencia</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* ¿Cómo nos conociste? */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm font-medium">¿Cómo nos conociste?</Label>
              <Select value={sourceValue} onValueChange={(v) => setValue('source', v as LeadSource)}>
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

            {/* CTA principal */}
            <div className="pt-1">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-base rounded-xl transition-all shadow-lg shadow-primary/30 group"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                ) : (
                  <>
                    Quiero recibir la información
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>

            {/* Trust signals */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="flex flex-col items-center gap-1 text-center">
                <Shield className="w-4 h-4 text-slate-500" />
                <span className="text-[10px] text-slate-500 leading-tight">Datos 100% seguros</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-[10px] text-slate-500 leading-tight">Respuesta en &lt;24h</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <Star className="w-4 h-4 text-slate-500" />
                <span className="text-[10px] text-slate-500 leading-tight">Sin compromiso</span>
              </div>
            </div>

            <p className="text-center text-slate-600 text-[10px]">
              Al enviar aceptas que nos comuniquemos contigo para enviarte información y ofertas.
            </p>
          </form>
        </div>

        {/* Social proof debajo del card */}
        <div className="flex items-center justify-center gap-3 mt-5">
          <div className="flex -space-x-2">
            {['A','M','C','J'].map((l, i) => (
              <div key={i} className="w-7 h-7 rounded-full border-2 border-slate-800 flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: ['#6366f1','#8b5cf6','#a78bfa','#7c3aed'][i] }}>
                {l}
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-xs">
            <span className="text-white font-semibold">+200 personas</span> ya recibieron su información
          </p>
        </div>

      </div>
    </div>
  )
}
