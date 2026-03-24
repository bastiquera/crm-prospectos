'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { deleteSale } from '@/app/actions/deleteSale'

interface Props {
  saleId: string
  saleInfo: string  // e.g. "Producto X · $150.000"
}

export function DeleteSaleButton({ saleId, saleInfo }: Props) {
  const [loading, setLoading]   = useState(false)
  const [confirm, setConfirm]   = useState(false)
  const [error,   setError]     = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    setError(null)
    const result = await deleteSale(saleId)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setConfirm(false)
    router.refresh()
  }

  if (confirm) {
    return (
      <div className="flex flex-col gap-1.5 items-end">
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          <span className="text-xs text-red-700 font-medium">¿Eliminar esta venta?</span>
        </div>
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setConfirm(false); setError(null) }}
            className="text-xs text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-md border border-border/60 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1"
          >
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            Sí, eliminar
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
      title={`Eliminar: ${saleInfo}`}
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
