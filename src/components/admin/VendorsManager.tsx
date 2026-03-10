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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Loader2, UserCheck, UserX, Mail, User } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Profile } from '@/types'

const schema = z.object({
  full_name: z.string().min(2, 'Nombre requerido'),
  email:     z.string().email('Email inválido'),
  password:  z.string().min(8, 'Mínimo 8 caracteres'),
})
type FormData = z.infer<typeof schema>

interface Props { sellers: Profile[] }

export function VendorsManager({ sellers: initialSellers }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [sellers, setSellers] = useState<Profile[]>(initialSellers)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onCreate(data: FormData) {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/create-seller', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Error al crear vendedor')
      setLoading(false)
      return
    }

    reset()
    setDialogOpen(false)
    setLoading(false)
    router.refresh()
  }

  async function toggleActive(seller: Profile) {
    await supabase
      .from('profiles')
      .update({ is_active: !seller.is_active })
      .eq('id', seller.id)

    setSellers((prev) =>
      prev.map((s) => s.id === seller.id ? { ...s, is_active: !s.is_active } : s)
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-white h-9 text-sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Nuevo vendedor
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-border/60 shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                {['Vendedor','Color','Email','Activo','Desde'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">{h}</th>
                ))}
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {sellers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground text-sm">
                    Sin vendedores. Crea el primero.
                  </td>
                </tr>
              ) : sellers.map((seller) => (
                <tr key={seller.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: seller.color_bg, color: seller.color_text }}
                      >
                        {seller.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{seller.full_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: seller.color_light, color: seller.color_bg }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: seller.color_bg }} />
                      {seller.color_name}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{seller.email}</td>
                  <td className="px-5 py-3.5">
                    <Badge
                      variant={seller.is_active ? 'default' : 'secondary'}
                      className={seller.is_active ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100' : ''}
                    >
                      {seller.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{formatDate(seller.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => toggleActive(seller)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      {seller.is_active
                        ? <><UserX className="w-3.5 h-3.5" />Desactivar</>
                        : <><UserCheck className="w-3.5 h-3.5" />Activar</>
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              Crear vendedor
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onCreate)} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Nombre completo</Label>
              <Input {...register('full_name')} placeholder="María González" className="h-10" />
              {errors.full_name && <p className="text-red-500 text-xs">{errors.full_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Email</Label>
              <Input {...register('email')} type="email" placeholder="maria@empresa.com" className="h-10" />
              {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Contraseña temporal</Label>
              <Input {...register('password')} type="password" placeholder="••••••••" className="h-10" />
              {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 h-10">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="flex-1 h-10 bg-primary hover:bg-primary/90 text-white">
                {loading ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Creando...</> : 'Crear vendedor'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
