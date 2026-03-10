'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Loader2, Package, ToggleLeft, ToggleRight, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'

interface Props { products: Product[] }

export function ProductsManager({ products: initialProducts }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function addProduct() {
    if (!newName.trim()) return
    setAdding(true)

    const { data } = await supabase
      .from('products')
      .insert({
        name:        newName.trim(),
        description: newDesc.trim() || null,
        price:       newPrice ? parseFloat(newPrice) : null,
        is_active:   true,
      })
      .select()
      .single()

    if (data) setProducts((prev) => [data as Product, ...prev])
    setNewName('')
    setNewPrice('')
    setNewDesc('')
    setAdding(false)
    router.refresh()
  }

  async function toggleProduct(id: string, current: boolean) {
    setTogglingId(id)
    await supabase.from('products').update({ is_active: !current }).eq('id', id)
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: !current } : p))
    )
    setTogglingId(null)
  }

  async function deleteProduct(id: string) {
    setDeletingId(id)
    await supabase.from('products').delete().eq('id', id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
    setDeletingId(null)
    router.refresh()
  }

  const active   = products.filter((p) => p.is_active)
  const inactive = products.filter((p) => !p.is_active)

  return (
    <div className="max-w-2xl space-y-6">
      {/* Add new product */}
      <div className="bg-white rounded-xl border border-border/60 shadow-card p-5 space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Nuevo producto / servicio
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nombre *</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ej. Plan mensual premium"
              className="h-9 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addProduct()}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Precio referencial (CLP)</Label>
            <Input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="ej. 150000"
              className="h-9 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Descripción (opcional)</Label>
          <Input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Breve descripción del producto"
            className="h-9 text-sm"
          />
        </div>

        <Button
          onClick={addProduct}
          disabled={adding || !newName.trim()}
          className="h-9 bg-primary hover:bg-primary/90 text-white px-5 text-sm"
        >
          {adding
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Agregando...</>
            : <><Plus className="w-4 h-4 mr-2" />Agregar producto</>
          }
        </Button>
      </div>

      {/* Active products */}
      {active.length > 0 && (
        <div className="bg-white rounded-xl border border-border/60 shadow-card">
          <div className="px-5 py-3.5 border-b border-border/40 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Productos activos</h3>
            <Badge className="text-xs bg-green-100 text-green-700 border-green-200 hover:bg-green-100 ml-auto">
              {active.length} activo{active.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="divide-y divide-border/40">
            {active.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                onToggle={toggleProduct}
                onDelete={deleteProduct}
                togglingId={togglingId}
                deletingId={deletingId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive products */}
      {inactive.length > 0 && (
        <div className="bg-white rounded-xl border border-border/60 shadow-card opacity-60">
          <div className="px-5 py-3.5 border-b border-border/40 flex items-center gap-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Productos desactivados</h3>
          </div>
          <div className="divide-y divide-border/40">
            {inactive.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                onToggle={toggleProduct}
                onDelete={deleteProduct}
                togglingId={togglingId}
                deletingId={deletingId}
              />
            ))}
          </div>
        </div>
      )}

      {products.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p>No hay productos definidos aún.</p>
          <p className="text-xs mt-1">Agrega productos para que los vendedores puedan seleccionarlos al cerrar una venta.</p>
        </div>
      )}
    </div>
  )
}

function ProductRow({
  product, onToggle, onDelete, togglingId, deletingId,
}: {
  product: Product
  onToggle: (id: string, current: boolean) => void
  onDelete: (id: string) => void
  togglingId: string | null
  deletingId: string | null
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 transition-colors group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{product.name}</p>
        {product.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{product.description}</p>
        )}
      </div>
      {product.price && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
          <DollarSign className="w-3 h-3" />
          {formatCurrency(product.price)}
        </div>
      )}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onToggle(product.id, product.is_active)}
          disabled={togglingId === product.id}
          title={product.is_active ? 'Desactivar' : 'Activar'}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          {togglingId === product.id
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : product.is_active
              ? <ToggleRight className="w-5 h-5 text-green-500" />
              : <ToggleLeft className="w-5 h-5" />
          }
        </button>
        <button
          onClick={() => onDelete(product.id)}
          disabled={deletingId === product.id}
          className="text-muted-foreground/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
        >
          {deletingId === product.id
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Trash2 className="w-3.5 h-3.5" />
          }
        </button>
      </div>
    </div>
  )
}
