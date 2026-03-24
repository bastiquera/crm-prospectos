'use client'

import { useState, useMemo, useTransition, useEffect } from 'react'
import { registerCommissionPayment } from '@/app/actions/registerCommissionPayment'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils'
import {
  DollarSign, Filter, Plus, Calendar, CheckCircle2,
  Loader2, TrendingUp, Clock, Percent, ChevronDown, ChevronUp,
  CreditCard, Users, RefreshCw,
} from 'lucide-react'
import type { Profile, Sale, CommissionPayment } from '@/types'

interface SaleRow extends Sale {
  user: Profile
}

interface PaymentRow extends CommissionPayment {
  seller: Profile
  payer: Profile
}

interface Props {
  sellers: Profile[]
  sales: SaleRow[]
  payments: PaymentRow[]
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function CommissionsAdmin({ sellers, sales, payments }: Props) {
  // ── Filters ─────────────────────────────────────────────────────
  const [filterSeller, setFilterSeller] = useState('all')
  const [filterFrom,   setFilterFrom]   = useState('')
  const [filterTo,     setFilterTo]     = useState('')

  // ── Pay dialog ───────────────────────────────────────────────────
  const [payOpen,      setPayOpen]      = useState(false)
  const [paySellerId,  setPaySellerId]  = useState('')
  const [payFrom,      setPayFrom]      = useState('')
  const [payTo,        setPayTo]        = useState('')
  const [payNotes,     setPayNotes]     = useState('')
  const [pending,      startTransition] = useTransition()
  // Datos frescos del diálogo — consultados directamente a Supabase
  const [dialogSales,  setDialogSales]  = useState<{ commission_amount: number }[]>([])
  const [dialogLoading, setDialogLoading] = useState(false)

  // ── Helpers ──────────────────────────────────────────────────────
  // Convierte "2025-01-15" → Date al inicio/fin del día para comparaciones seguras
  function dayStart(d: string) { return new Date(d + 'T00:00:00') }
  function dayEnd(d: string)   { return new Date(d + 'T23:59:59') }

  // ── Filtered sales ───────────────────────────────────────────────
  const filteredSales = useMemo(() => {
    const from = filterFrom ? dayStart(filterFrom) : null
    const to   = filterTo   ? dayEnd(filterTo)     : null
    return sales.filter((s) => {
      if (filterSeller !== 'all' && s.user_id !== filterSeller) return false
      const saleDate = new Date(s.closed_at)
      if (from && saleDate < from) return false
      if (to   && saleDate > to)   return false
      return true
    })
  }, [sales, filterSeller, filterFrom, filterTo])

  // ── Summary per seller (based on filtered sales) ─────────────────
  const sellerSummary = useMemo(() => {
    const map = new Map<string, {
      seller: Profile
      totalSales: number
      totalCommission: number
      totalPaid: number
      pendingAmount: number
    }>()

    // Initialize all sellers that appear in filtered sales
    for (const sale of filteredSales) {
      if (!map.has(sale.user_id)) {
        map.set(sale.user_id, {
          seller: sale.user,
          totalSales: 0, totalCommission: 0, totalPaid: 0, pendingAmount: 0,
        })
      }
      const row = map.get(sale.user_id)!
      row.totalSales      += Number(sale.value)
      row.totalCommission += Number(sale.commission_amount)
    }

    // Add paid totals (all-time, per seller who appears in view)
    for (const pay of payments) {
      const row = map.get(pay.seller_id)
      if (row) row.totalPaid += Number(pay.total_amount)
    }

    // Calculate pending:
    // Usamos !commission_payment_id para manejar null Y undefined,
    // evitando falsos negativos si Supabase devuelve undefined en lugar de null.
    for (const row of map.values()) {
      const unpaidSales = sales.filter(
        (s) => s.user_id === row.seller.id && !s.commission_payment_id
      )
      row.pendingAmount = unpaidSales.reduce((sum, s) => sum + Number(s.commission_amount), 0)
    }

    return Array.from(map.values()).sort((a, b) => b.totalCommission - a.totalCommission)
  }, [filteredSales, sales, payments])

  // ── Fetch fresh unpaid sales when dialog params change ───────────
  // Consulta directamente a Supabase para evitar datos obsoletos del prop.
  useEffect(() => {
    if (!payOpen || !paySellerId || !payFrom || !payTo) {
      setDialogSales([])
      return
    }
    setDialogLoading(true)
    const supabase = createClient()
    supabase
      .from('sales')
      .select('commission_amount')
      .eq('user_id', paySellerId)
      .is('commission_payment_id', null)
      .gte('closed_at', payFrom + 'T00:00:00')
      .lte('closed_at', payTo + 'T23:59:59')
      .then(({ data }) => {
        setDialogSales((data ?? []) as { commission_amount: number }[])
        setDialogLoading(false)
      })
  }, [payOpen, paySellerId, payFrom, payTo])

  // ── Payment preview ───────────────────────────────────────────────
  const payPreview = useMemo(() => ({
    amount: dialogSales.reduce((sum, s) => sum + Number(s.commission_amount), 0),
    count:  dialogSales.length,
  }), [dialogSales])

  function openPayDialog() {
    setPaySellerId(filterSeller !== 'all' ? filterSeller : '')
    setPayFrom(filterFrom)
    setPayTo(filterTo)
    setPayNotes('')
    setPayOpen(true)
  }

  function handleRegisterPayment() {
    if (!paySellerId || !payFrom || !payTo) return
    startTransition(async () => {
      await registerCommissionPayment({
        sellerId:    paySellerId,
        periodStart: payFrom,
        periodEnd:   payTo,
        totalAmount: payPreview.amount,
        salesCount:  payPreview.count,
        notes:       payNotes || undefined,
      })
      setPayOpen(false)
    })
  }

  const totalCommissionAll = filteredSales.reduce((s, x) => s + Number(x.commission_amount), 0)
  const totalPaidAll       = payments.reduce((s, p) => s + Number(p.total_amount), 0)

  return (
    <div className="space-y-6">

      {/* ── Filters ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-border/60 shadow-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mr-1">
            <Filter className="w-3.5 h-3.5" /> Filtros
          </div>

          {/* Seller */}
          <div className="space-y-1 min-w-[180px]">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> Vendedora
            </Label>
            <Select value={filterSeller} onValueChange={(v) => setFilterSeller(v ?? 'all')}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las vendedoras</SelectItem>
                {sellers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* From */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Desde
            </Label>
            <Input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="h-8 text-xs w-36"
            />
          </div>

          {/* To */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hasta</Label>
            <Input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="h-8 text-xs w-36"
            />
          </div>

          {(filterSeller !== 'all' || filterFrom || filterTo) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => { setFilterSeller('all'); setFilterFrom(''); setFilterTo('') }}
            >
              Limpiar
            </Button>
          )}

          <div className="ml-auto">
            <Button onClick={openPayDialog} size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90 text-white gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Registrar pago
            </Button>
          </div>
        </div>
      </div>

      {/* ── Summary cards per seller ───────────────────────────────── */}
      {sellerSummary.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sellerSummary.map(({ seller, totalSales, totalCommission, totalPaid, pendingAmount }) => (
            <div key={seller.id} className="bg-white rounded-xl border border-border/60 shadow-card p-5 space-y-4">
              {/* Seller header */}
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: seller.color_bg, color: seller.color_text }}
                >
                  {seller.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{seller.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{seller.email}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> Ventas (período)
                  </span>
                  <span className="text-sm font-semibold text-foreground">{formatCurrency(totalSales)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Percent className="w-3 h-3" /> Comisión ganada (período)
                  </span>
                  <span className="text-sm font-bold text-indigo-600">{formatCurrency(totalCommission)}</span>
                </div>
                <div className="h-px bg-border/40" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" /> Total pagado
                  </span>
                  <span className="text-sm font-semibold text-green-600">{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-500" /> Por pagar
                  </span>
                  <span className={`text-sm font-bold ${pendingAmount > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    {formatCurrency(pendingAmount)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p>No hay ventas con comisiones en el período seleccionado.</p>
        </div>
      )}

      {/* ── Totals bar ────────────────────────────────────────────── */}
      {filteredSales.length > 0 && (
        <div className="bg-gradient-to-r from-primary to-indigo-600 rounded-xl p-5 text-white flex flex-wrap gap-6">
          <div>
            <p className="text-white/70 text-xs font-medium">Comisiones en vista</p>
            <p className="text-2xl font-bold">{formatCurrency(totalCommissionAll)}</p>
            <p className="text-white/50 text-xs">{filteredSales.length} ventas</p>
          </div>
          <div className="h-auto w-px bg-white/20 self-stretch" />
          <div>
            <p className="text-white/70 text-xs font-medium">Total pagado (histórico)</p>
            <p className="text-2xl font-bold">{formatCurrency(totalPaidAll)}</p>
            <p className="text-white/50 text-xs">{payments.length} pagos registrados</p>
          </div>
        </div>
      )}

      {/* ── Sales detail table ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-border/60 shadow-card">
        <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Detalle de comisiones</h3>
          <span className="ml-auto text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
            {filteredSales.length}
          </span>
        </div>

        {filteredSales.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground text-sm">
            Sin ventas en el período seleccionado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/50">
                  {['Fecha', 'Vendedora', 'Producto', 'Valor venta', '% Comisión', 'Comisión', 'Estado'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] text-muted-foreground font-semibold uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className={`hover:bg-slate-50/40 transition-colors ${!!sale.commission_payment_id ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(sale.closed_at).toLocaleDateString('es-CL', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{ backgroundColor: sale.user?.color_bg ?? '#6366F1', color: sale.user?.color_text ?? '#fff' }}
                        >
                          {sale.user?.full_name?.charAt(0) ?? '?'}
                        </div>
                        <span className="text-xs whitespace-nowrap">{sale.user?.full_name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        {sale.product}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-foreground whitespace-nowrap">
                      {formatCurrency(Number(sale.value))}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {Number(sale.commission_percentage) > 0
                        ? <span className="text-indigo-600 font-medium">{Number(sale.commission_percentage)}%</span>
                        : <span className="text-muted-foreground/50">—</span>
                      }
                    </td>
                    <td className="px-5 py-3.5 font-bold text-indigo-600 whitespace-nowrap">
                      {Number(sale.commission_amount) > 0
                        ? formatCurrency(Number(sale.commission_amount))
                        : <span className="text-muted-foreground/40 font-normal">—</span>
                      }
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {!!sale.commission_payment_id
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle2 className="w-3 h-3" /> Pagada
                          </span>
                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" /> Pendiente
                          </span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Payment history ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-border/60 shadow-card">
        <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Historial de pagos registrados</h3>
          <span className="ml-auto text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
            {payments.length}
          </span>
        </div>

        {payments.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground text-sm">
            No hay pagos registrados aún
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-slate-50/50">
                  {['Fecha de pago', 'Vendedora', 'Período pagado', '# Ventas', 'Monto pagado', 'Notas'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] text-muted-foreground font-semibold uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {payments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(pay.paid_at).toLocaleDateString('es-CL', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{ backgroundColor: pay.seller?.color_bg ?? '#6366F1', color: pay.seller?.color_text ?? '#fff' }}
                        >
                          {pay.seller?.full_name?.charAt(0) ?? '?'}
                        </div>
                        <span className="text-xs whitespace-nowrap">{pay.seller?.full_name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(pay.period_start)} — {fmtDate(pay.period_end)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-center">{pay.sales_count}</td>
                    <td className="px-5 py-3.5 font-bold text-green-600 whitespace-nowrap">
                      {formatCurrency(Number(pay.total_amount))}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-[200px] truncate">
                      {pay.notes ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Register Payment Dialog ───────────────────────────────── */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              Registrar pago de comisiones
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Seller */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Vendedora</Label>
              <Select value={paySellerId} onValueChange={(v) => setPaySellerId(v ?? '')}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Selecciona una vendedora..." />
                </SelectTrigger>
                <SelectContent>
                  {/* Incluye TODOS los que tienen ventas (independiente del rol) + sellers activos sin ventas */}
                  {Array.from(
                    new Map([
                      ...sellerSummary.map((r) => [r.seller.id, r.seller] as [string, Profile]),
                      ...sellers.map((s) => [s.id, s] as [string, Profile]),
                    ]).values()
                  ).sort((a, b) => a.full_name.localeCompare(b.full_name))
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Fecha inicio</Label>
                <Input
                  type="date"
                  value={payFrom}
                  onChange={(e) => setPayFrom(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Fecha fin</Label>
                <Input
                  type="date"
                  value={payTo}
                  onChange={(e) => setPayTo(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
            </div>

            {/* Preview */}
            {paySellerId && payFrom && payTo && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-100 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-green-700 font-medium">Resumen del período</p>
                  <button
                    type="button"
                    onClick={() => { setDialogSales([]); setDialogLoading(true); const sb = createClient(); sb.from('sales').select('commission_amount').eq('user_id', paySellerId).is('commission_payment_id', null).gte('closed_at', payFrom + 'T00:00:00').lte('closed_at', payTo + 'T23:59:59').then(({ data }) => { setDialogSales((data ?? []) as { commission_amount: number }[]); setDialogLoading(false) }) }}
                    className="flex items-center gap-1 text-[11px] text-green-600 hover:text-green-800 transition-colors"
                    title="Actualizar datos"
                  >
                    <RefreshCw className={`w-3 h-3 ${dialogLoading ? 'animate-spin' : ''}`} />
                    Actualizar
                  </button>
                </div>
                {dialogLoading ? (
                  <div className="flex items-center justify-center py-2 gap-2 text-xs text-green-600">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Consultando ventas...
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-600"># de ventas</span>
                      <span className="text-sm font-bold text-green-700">{payPreview.count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-600">Monto a pagar</span>
                      <span className="text-xl font-bold text-green-700">{formatCurrency(payPreview.amount)}</span>
                    </div>
                    {payPreview.count === 0 && (
                      <p className="text-xs text-amber-600">⚠ No hay ventas con comisión pendientes en este período.</p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Notas (opcional)</Label>
              <Textarea
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="ej. Pago enero 2025, transferencia bancaria"
                className="resize-none h-16 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-3 mt-2">
            <Button variant="outline" onClick={() => setPayOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleRegisterPayment}
              disabled={pending || !paySellerId || !payFrom || !payTo || payPreview.amount === 0}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {pending
                ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Guardando...</>
                : <><CheckCircle2 className="w-4 h-4 mr-1.5" />Confirmar pago</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
