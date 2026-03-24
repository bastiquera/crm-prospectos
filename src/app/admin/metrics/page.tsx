import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { LEAD_SOURCE_LABELS, type Profile, type PipelineStage, type Course } from '@/types'
import { TrendingUp, Package, Users, Layers, BookOpen } from 'lucide-react'
import { MetricsDateFilter } from '@/components/admin/MetricsDateFilter'
import { RealtimeRefresher } from '@/components/RealtimeRefresher'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function AdminMetricsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const params   = await searchParams
  const from = params.from
  const to   = params.to

  // ── Filtered queries ─────────────────────────────────────────
  let leadsQuery = supabase.from('leads').select('id, status, source, assigned_to, created_at, stage_id, course_id')
  if (from) leadsQuery = leadsQuery.gte('created_at', `${from}T00:00:00`)
  if (to)   leadsQuery = leadsQuery.lte('created_at', `${to}T23:59:59`)

  let salesQuery = supabase.from('sales').select('value, user_id, product, closed_at').is('deleted_at', null)
  if (from) salesQuery = salesQuery.gte('closed_at', `${from}T00:00:00`)
  if (to)   salesQuery = salesQuery.lte('closed_at', `${to}T23:59:59`)

  const [
    { data: leads },
    { data: sales },
    { data: sellers },
    { data: stages },
    { data: allLeads },   // all-time for follow-up count (assigned)
    { data: courses },
  ] = await Promise.all([
    leadsQuery,
    salesQuery,
    supabase.from('profiles').select('*').eq('role', 'seller').order('created_at'),
    supabase.from('pipeline_stages').select('*').order('order_index'),
    supabase.from('leads').select('id, assigned_to, status, stage_id').eq('status', 'assigned'),
    supabase.from('courses').select('*').eq('is_active', true).order('order_index'),
  ])

  const totalLeads = leads?.length ?? 0
  const totalValue = sales?.reduce((s, sale) => s + Number(sale.value), 0) ?? 0

  // ── Leads by source ──────────────────────────────────────────
  const bySource = Object.entries(LEAD_SOURCE_LABELS)
    .map(([source, label]) => ({
      source, label,
      count: leads?.filter((l) => l.source === source).length ?? 0,
    }))
    .sort((a, b) => b.count - a.count)

  // ── Most sold product globally ───────────────────────────────
  const productCounts: Record<string, number> = {}
  sales?.forEach((s) => {
    productCounts[s.product] = (productCounts[s.product] || 0) + 1
  })
  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // ── Leads by course ──────────────────────────────────────────
  const byCourse = (courses ?? []).map((course: Course) => ({
    course,
    count: leads?.filter((l) => l.course_id === course.id).length ?? 0,
  })).sort((a, b) => b.count - a.count)
  const noCourseCount = leads?.filter((l) => !l.course_id).length ?? 0

  // ── Stage map for quick lookup ───────────────────────────────
  const stageMap = new Map((stages ?? []).map((s: PipelineStage) => [s.id, s]))
  const activeStages = (stages ?? []).filter(
    (s: PipelineStage) => !s.is_initial && !s.is_closed_won && !s.is_closed_lost
  ) as PipelineStage[]

  return (
    <div className="space-y-6">
      <RealtimeRefresher tables={['leads', 'sales']} />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Métricas globales</h1>
        <p className="text-muted-foreground text-sm mt-1">Análisis completo de leads, ventas y rendimiento</p>
      </div>

      {/* Date Filter */}
      <Suspense fallback={null}>
        <MetricsDateFilter />
      </Suspense>

      {/* Period summary */}
      {(from || to) && (
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card text-center">
            <p className="stat-number text-2xl text-foreground">{totalLeads}</p>
            <p className="text-xs text-muted-foreground mt-1">Leads en período</p>
          </div>
          <div className="stat-card text-center">
            <p className="stat-number text-2xl text-foreground">{sales?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Ventas cerradas</p>
          </div>
          <div className="stat-card text-center">
            <p className="stat-number text-2xl text-green-600">{formatCurrency(totalValue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Ingresos del período</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by source */}
        <div className="bg-white rounded-xl border border-border/60 shadow-card p-5">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            Leads por fuente
            {(from || to) && <span className="text-xs text-primary font-normal ml-1">(período filtrado)</span>}
          </h3>
          <div className="space-y-3">
            {bySource.filter(s => s.count > 0).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos en este período</p>
            ) : (
              bySource.map(({ source, label, count }) => {
                const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0
                return (
                  <div key={source}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground">{label}</span>
                      <span className="text-sm font-semibold">{count}
                        <span className="text-muted-foreground font-normal text-xs ml-1">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Top products */}
        <div className="bg-white rounded-xl border border-border/60 shadow-card p-5">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            Productos más vendidos
            {(from || to) && <span className="text-xs text-primary font-normal ml-1">(período filtrado)</span>}
          </h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin ventas en este período</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map(([product, count], idx) => {
                const maxCount = topProducts[0][1]
                const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
                return (
                  <div key={product}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                          idx === 1 ? 'bg-slate-100 text-slate-600' :
                          'bg-slate-50 text-slate-500'
                        }`}>{idx + 1}</span>
                        <span className="text-sm text-foreground font-medium truncate max-w-[160px]">{product}</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground flex-shrink-0">
                        {count} <span className="text-xs text-muted-foreground font-normal">venta{count !== 1 ? 's' : ''}</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${idx === 0 ? 'bg-yellow-400' : 'bg-primary/60'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Leads by course */}
      {(courses ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-border/60 shadow-card p-5">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            Leads por curso de interés
            {(from || to) && <span className="text-xs text-primary font-normal ml-1">(período filtrado)</span>}
          </h3>
          <div className="space-y-3">
            {byCourse.map(({ course, count }) => {
              const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0
              return (
                <div key={course.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground">{course.name}</span>
                    <span className="text-sm font-semibold">{count}
                      <span className="text-muted-foreground font-normal text-xs ml-1">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {noCourseCount > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Sin curso seleccionado</span>
                  <span className="text-sm font-semibold text-muted-foreground">{noCourseCount}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-300 rounded-full" style={{ width: `${totalLeads > 0 ? Math.round((noCourseCount / totalLeads) * 100) : 0}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Per-seller detailed performance */}
      <div className="bg-white rounded-xl border border-border/60 shadow-card">
        <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Rendimiento detallado por vendedor</h3>
          {(from || to) && <span className="text-xs text-primary font-medium ml-auto">Período filtrado</span>}
        </div>

        <div className="divide-y divide-border/40">
          {(sellers ?? []).map((seller: Profile) => {
            const sellerLeads  = leads?.filter((l) => l.assigned_to === seller.id) ?? []
            const sellerSales  = sales?.filter((s) => s.user_id === seller.id) ?? []
            const sellerValue  = sellerSales.reduce((s, sale) => s + Number(sale.value), 0)
            const conv = sellerLeads.length > 0
              ? Math.round((sellerLeads.filter((l) => l.status === 'closed').length / sellerLeads.length) * 100)
              : 0
            const pct = totalValue > 0 ? Math.round((sellerValue / totalValue) * 100) : 0

            // Most sold product for this seller
            const spCounts: Record<string, number> = {}
            sellerSales.forEach((s) => {
              spCounts[s.product] = (spCounts[s.product] || 0) + 1
            })
            const topSellerProduct = Object.entries(spCounts).sort((a, b) => b[1] - a[1])[0]

            // Leads in follow-up (active/assigned) — all time
            const inFollowUp = allLeads?.filter((l) => l.assigned_to === seller.id).length ?? 0

            // Stage breakdown (all-time assigned leads)
            const sellerAllLeads = allLeads?.filter((l) => l.assigned_to === seller.id) ?? []
            const stageBreakdown = activeStages.map((stage) => ({
              stage,
              count: sellerAllLeads.filter((l) => l.stage_id === stage.id).length,
            })).filter((sb) => sb.count > 0)

            return (
              <div key={seller.id} className="px-5 py-5">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: seller.color_bg, color: seller.color_text }}
                  >
                    {seller.full_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{seller.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {sellerLeads.length} leads · {sellerSales.length} ventas · {conv}% conversión
                    </p>
                  </div>
                  <span className="text-sm font-bold text-green-600">{formatCurrency(sellerValue)}</span>
                </div>

                {/* Revenue bar */}
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: seller.color_bg }}
                  />
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* In follow-up */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-border/40">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-1">En seguimiento</p>
                    <p className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-jakarta)' }}>
                      {inFollowUp}
                    </p>
                    <p className="text-[11px] text-muted-foreground">prospectos activos</p>
                  </div>

                  {/* Closed */}
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-1">Ventas cerradas</p>
                    <p className="text-xl font-bold text-green-700" style={{ fontFamily: 'var(--font-jakarta)' }}>
                      {sellerSales.length}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{conv}% conversión</p>
                  </div>

                  {/* Top product */}
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 sm:col-span-2">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-1">Producto más vendido</p>
                    {topSellerProduct ? (
                      <>
                        <p
                          className="text-sm font-bold text-amber-800 truncate"
                          style={{ fontFamily: 'var(--font-jakarta)' }}
                        >
                          {topSellerProduct[0]}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{topSellerProduct[1]} venta{topSellerProduct[1] !== 1 ? 's' : ''}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin ventas aún</p>
                    )}
                  </div>
                </div>

                {/* Stage breakdown */}
                {stageBreakdown.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-2 flex items-center gap-1.5">
                      <Layers className="w-3 h-3" />
                      Distribución por etapa (activos)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {stageBreakdown.map(({ stage, count }) => (
                        <span
                          key={stage.id}
                          className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full border"
                          style={{
                            backgroundColor: `${seller.color_bg}18`,
                            borderColor: `${seller.color_bg}40`,
                            color: seller.color_bg,
                          }}
                        >
                          {stage.name}
                          <span
                            className="font-bold px-1.5 py-0.5 rounded-full text-[11px]"
                            style={{ backgroundColor: seller.color_bg, color: seller.color_text }}
                          >
                            {count}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
