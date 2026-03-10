'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CalendarDays, X } from 'lucide-react'

export function MetricsDateFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [from, setFrom] = useState(searchParams.get('from') ?? '')
  const [to, setTo] = useState(searchParams.get('to') ?? '')

  const hasFilter = searchParams.get('from') || searchParams.get('to')

  function applyFilter() {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    router.push(`/admin/metrics?${params.toString()}`)
  }

  function clearFilter() {
    setFrom('')
    setTo('')
    router.push('/admin/metrics')
  }

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-white rounded-xl border border-border/60 shadow-card">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <CalendarDays className="w-4 h-4 text-primary" />
        Filtrar por período
      </div>

      <div className="flex flex-wrap items-center gap-2 flex-1">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border/60 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            min={from}
            className="h-9 px-3 rounded-lg border border-border/60 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={applyFilter}
            disabled={!from && !to}
            size="sm"
            className="h-9 bg-primary hover:bg-primary/90 text-white px-4 text-sm"
          >
            Aplicar
          </Button>

          {hasFilter && (
            <Button
              onClick={clearFilter}
              size="sm"
              variant="outline"
              className="h-9 px-3 text-sm gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {hasFilter && (
        <p className="w-full text-xs text-primary font-medium">
          Mostrando datos del{from ? ` ${from}` : ' inicio'} al{to ? ` ${to}` : ' hoy'}
        </p>
      )}
    </div>
  )
}
