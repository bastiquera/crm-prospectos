'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, BarChart3, Lock, Mail } from 'lucide-react'

export default function LoginPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single()

    router.push(profile?.role === 'admin' ? '/admin' : '/seller')
  }

  return (
    <div className="min-h-screen bg-background flex">

      {/* Left panel — brand / dark */}
      <div className="hidden lg:flex lg:w-[52%] bg-[#080F1E] flex-col justify-between p-14 relative overflow-hidden">

        {/* Gradient glow */}
        <div className="absolute top-[-80px] left-[-80px] w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-60px] right-[-60px] w-[300px] h-[300px] bg-violet-600/15 rounded-full blur-[80px] pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <span
            className="text-white font-bold text-[17px] tracking-tight"
            style={{ fontFamily: 'var(--font-jakarta)' }}
          >
            CRM Pro
          </span>
        </div>

        {/* Hero copy */}
        <div className="space-y-8 relative z-10">
          <div className="space-y-4">
            <p className="text-indigo-400 text-[11px] font-semibold tracking-widest uppercase">
              Plataforma de ventas
            </p>
            <h1
              className="text-5xl font-extrabold text-white leading-[1.05]"
              style={{ fontFamily: 'var(--font-jakarta)', letterSpacing: '-0.04em' }}
            >
              Gestión de<br />
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                ventas en vivo
              </span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              Captura leads, haz seguimiento y cierra ventas con tu equipo de forma sincronizada en tiempo real.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Leads en tiempo real', desc: 'First-come-first-served' },
              { label: 'Pipeline Kanban',       desc: 'Etapas personalizadas' },
              { label: 'Métricas detalladas',   desc: 'Por vendedor y global' },
              { label: 'Seguimiento completo',  desc: 'Historial y actividad' },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.07] backdrop-blur-sm"
              >
                <p
                  className="text-white text-[13px] font-semibold"
                  style={{ fontFamily: 'var(--font-jakarta)' }}
                >
                  {item.label}
                </p>
                <p className="text-slate-500 text-[12px] mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-[12px] relative z-10">
          © 2025 CRM Pro · Todos los derechos reservados
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-[360px] space-y-8">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span
              className="font-bold text-lg tracking-tight"
              style={{ fontFamily: 'var(--font-jakarta)' }}
            >
              CRM Pro
            </span>
          </div>

          <div className="space-y-1.5">
            <h2
              className="text-[26px] font-bold text-foreground"
              style={{ fontFamily: 'var(--font-jakarta)', letterSpacing: '-0.03em' }}
            >
              Bienvenido de nuevo
            </h2>
            <p className="text-muted-foreground text-[13.5px]">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-medium text-foreground/80">
                Correo electrónico
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 text-[14px] border-slate-200 focus:border-primary bg-slate-50/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px] font-medium text-foreground/80">
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 text-[14px] border-slate-200 focus:border-primary bg-slate-50/50"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-[13px] rounded-lg px-4 py-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-semibold text-[14px] shadow-lg shadow-indigo-500/25 transition-all"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Ingresando...</>
                : 'Ingresar al CRM'
              }
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
