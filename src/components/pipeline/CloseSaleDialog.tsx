'use client'

import { useState, useEffect } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Trophy, Package } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Lead, Profile, Product } from '@/types'

const schema = z.object({
  value:      z.string().min(1, 'Ingresa el valor de la venta'),
  product_id: z.string().min(1, 'Selecciona un producto'),
  notes:      z.string().optional(),
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
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const selectedProductId = watch('product_id')
  const selectedProduct = products.find((p) => p.id === selectedProductId)

  // Load products when dialog opens
  useEffect(() => {
    if (!open) return
    setLoadingProducts(true)
    supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        setProducts((data ?? []) as Product[])
        setLoadingProducts(false)
      })
  }, [open])

  async function onSubmit(data: FormData) {
    setLoading(true)

    const product = products.find((p) => p.id === data.product_id)
    const productName = product?.name ?? data.product_id

    // Get closed-won stage
    const { data: closedStage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('is_closed_won', true)
      .single()

    // Update lead
    await supabase.from('leads').update({
      status:          'closed',
      stage_id:        closedStage?.id ?? lead.stage_id,
      closed_at:       new Date().toISOString(),
      estimated_value: parseFloat(data.value),
    }).eq('id', lead.id)

    // Register sale
    await supabase.from('sales').insert({
      lead_id:   lead.id,
      user_id:   profile.id,
      value:     parseFloat(data.value),
      product:   productName,
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
          {/* Product select */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Producto / Servicio</Label>
            {loadingProducts ? (
              <div className="h-10 flex items-center gap-2 px-3 rounded-lg border border-border/60 text-sm text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Cargando productos...
              </div>
            ) : products.length === 0 ? (
              <div className="h-10 flex items-center gap-2 px-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-700">
                <Package className="w-3.5 h-3.5" />
                No hay productos definidos. Pide al admin que los configure.
              </div>
            ) : (
              <Select onValueChange={(v: string | null) => { if (v) setValue('product_id', v) }}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Selecciona un producto..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center justify-between gap-4 w-full">
                        <span>{product.name}</span>
                        {product.price && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatCurrency(product.price)}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.product_id && (
              <p className="text-red-500 text-xs">{errors.product_id.message}</p>
            )}
            {selectedProduct?.description && (
              <p className="text-xs text-muted-foreground pl-1">{selectedProduct.description}</p>
            )}
          </div>

          {/* Value */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Valor de la venta (CLP)
              {selectedProduct?.price && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  Referencia: {formatCurrency(selectedProduct.price)}
                </span>
              )}
            </Label>
            <Input
              {...register('value')}
              type="number"
              placeholder={selectedProduct?.price?.toString() ?? 'ej. 150000'}
              className="h-10"
            />
            {errors.value && <p className="text-red-500 text-xs">{errors.value.message}</p>}
          </div>

          {/* Notes */}
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
              disabled={loading || products.length === 0}
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
