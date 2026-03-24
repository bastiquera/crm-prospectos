'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { SystemCostRate, Sale } from '@/types'
import { DollarSign, TrendingUp, ShoppingBag, History, Plus, Calendar, Pencil } from 'lucide-react'

interface Props {
  rates: SystemCostRate[]
  sales: Pick<Sale, 'id' | 'closed_at'>[]
}

// Devuelve la tarifa vigente para una venta dada su fecha de cierre
function getRateForDate(date: string, rates: SystemCostRate[]): number {
  const closeTime = new Date(date).getTime()
  const applicable = rates
    .filter(r => new Date(r.effective_from).getTime() <= closeTime)
    .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime())
  return applicable.length > 0 ? Number(applicable[0].rate) : 0
}

export function SystemCostManager({ rates: initialRates, sales }: Props) {
  const supabase = createClient()

  const [rates, setRates] = useState<SystemCostRate[]>(initialRates)
  const [showForm, setShowForm] = useState(false)
  const [newRate, setNewRate] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filtro de fechas
  const today = new Date().toISOString().split('T')[0]
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const [dateFrom, setDateFrom] = useState(firstDay)
  const [dateTo, setDateTo] = useState(today)

  // Ventas dentro del rango de fechas
  const filteredSales = useMemo(() => {
    const from = new Date(dateFrom + 'T00:00:00').getTime()
    const to = new Date(dateTo + 'T23:59:59').getTime()
    return sales.filter(s => {
      const t = new Date(s.closed_at).getTime()
      return t >= from && t <= to
    })
  }, [sales, dateFrom, dateTo])

  // Costo total en el rango
  const totalCost = useMemo(() => {
    return filteredSales.reduce((acc, sale) => {
      return acc + getRateForDate(sale.closed_at, rates)
    }, 0)
  }, [filteredSales, rates])

  // Tarifa actual
  const currentRate = useMemo(() => {
    if (rates.length === 0) return null
    return [...rates].sort(
      (a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
    )[0]
  }, [rates])

  async function handleSaveRate() {
    const parsed = parseFloat(newRate.replace(/\./g, '').replace(',', '.'))
    if (isNaN(parsed) || parsed <= 0) {
      setError('Ingresa un valor válido mayor a 0')
      return
    }
    setSaving(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('system_cost_rates')
      .insert({ rate: parsed, notes: newNotes || null })
      .select()
      .single()

    if (err) {
      setError('Error al guardar: ' + err.message)
    } else {
      setRates(prev => [data as SystemCostRate, ...prev])
      setNewRate('')
      setNewNotes('')
      setShowForm(false)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">

      {/* Filtro de fechas */}
      <div className="bg-white rounded-xl border border-border/60 shadow-sm px-5 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            Período:
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={e => setDateFrom(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-1.5 text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <span className="text-slate-400 text-sm">—</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={e => setDateTo(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-1.5 text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <span className="ml-auto text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            {filteredSales.length} venta{filteredSales.length !== 1 ? 's' : ''} en el período
          </span>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total ventas */}
        <div className="bg-white rounded-xl border border-border/60 shadow-sm px-5 py-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Ventas en período</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{filteredSales.length}</p>
          </div>
        </div>

        {/* Valor por venta actual */}
        <div className="bg-white rounded-xl border border-border/60 shadow-sm px-5 py-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Valor actual por venta</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              {currentRate ? formatCurrency(currentRate.rate) : '—'}
            </p>
            {currentRate && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                Desde {formatDate(currentRate.effective_from)}
              </p>
            )}
          </div>
        </div>

        {/* Costo total acumulado */}
        <div className="bg-white rounded-xl border border-border/60 shadow-sm px-5 py-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Costo total a pagar</p>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{formatCurrency(totalCost)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">En el período seleccionado</p>
          </div>
        </div>
      </div>

      {/* Configurar nuevo valor por venta */}
      <div className="bg-white rounded-xl border border-border/60 shadow-sm">
        <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Valor por venta</h3>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {currentRate ? 'Actualizar valor' : 'Configurar valor'}
            </button>
          )}
        </div>

        {showForm ? (
          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              El nuevo valor se aplicará desde ahora en adelante. Las ventas anteriores no serán recalculadas.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Nuevo valor por venta (CLP)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Ej: 1500"
                  value={newRate}
                  onChange={e => setNewRate(e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Notas (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Actualización marzo 2025"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleSaveRate}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <button
                onClick={() => { setShowForm(false); setError(null) }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4">
            {currentRate ? (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-sm text-foreground font-medium">
                  {formatCurrency(currentRate.rate)} por venta
                </span>
                <span className="text-xs text-slate-400">
                  · vigente desde {formatDate(currentRate.effective_from)}
                </span>
                {currentRate.notes && (
                  <span className="text-xs text-slate-400 italic">· {currentRate.notes}</span>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay valor configurado aún. Configura el costo por venta para comenzar el seguimiento.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Historial de tarifas */}
      {rates.length > 0 && (
        <div className="bg-white rounded-xl border border-border/60 shadow-sm">
          <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Historial de valores</h3>
            <span className="ml-auto text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
              {rates.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/50">
                  {['Vigente desde', 'Valor por venta', 'Notas', 'Estado'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] text-muted-foreground font-semibold uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {[...rates]
                  .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime())
                  .map((rate, idx) => (
                    <tr key={rate.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap text-foreground">
                        {formatDate(rate.effective_from)}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-emerald-600 whitespace-nowrap">
                        {formatCurrency(rate.rate)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">
                        {rate.notes ?? '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {idx === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            Actual
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                            Histórico
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detalle de ventas en el período */}
      {filteredSales.length > 0 && (
        <div className="bg-white rounded-xl border border-border/60 shadow-sm">
          <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Detalle de costos en el período</h3>
            <span className="ml-auto text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
              {filteredSales.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/50">
                  {['Fecha de cierre', 'Tarifa aplicada', 'Costo'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] text-muted-foreground font-semibold uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {[...filteredSales]
                  .sort((a, b) => new Date(b.closed_at).getTime() - new Date(a.closed_at).getTime())
                  .map(sale => {
                    const rate = getRateForDate(sale.closed_at, rates)
                    return (
                      <tr key={sale.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-5 py-3 text-foreground whitespace-nowrap">
                          {formatDate(sale.closed_at)}
                        </td>
                        <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                          {rate > 0 ? formatCurrency(rate) : <span className="text-slate-300">Sin tarifa</span>}
                        </td>
                        <td className="px-5 py-3 font-semibold text-emerald-600 whitespace-nowrap">
                          {rate > 0 ? formatCurrency(rate) : '—'}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50/60 border-t border-border/40">
                  <td colSpan={2} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Total
                  </td>
                  <td className="px-5 py-3 font-bold text-emerald-700">
                    {formatCurrency(totalCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
