import { createClient } from '@/lib/supabase/server'
import { ProductsManager } from '@/components/admin/ProductsManager'
import type { Product } from '@/types'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Productos y Servicios</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Define los productos que los vendedores podrán seleccionar al cerrar una venta
        </p>
      </div>
      <ProductsManager products={(products ?? []) as Product[]} />
    </div>
  )
}
