'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function registerCommissionPayment({
  sellerId,
  periodStart,
  periodEnd,
  totalAmount,
  salesCount,
  notes,
}: {
  sellerId: string
  periodStart: string
  periodEnd: string
  totalAmount: number
  salesCount: number
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Solo el administrador puede registrar pagos')

  // 1. Insertar el registro de pago y obtener su ID
  const { data: payment, error: payError } = await supabase
    .from('commission_payments')
    .insert({
      seller_id:    sellerId,
      paid_by:      user.id,
      period_start: periodStart,
      period_end:   periodEnd,
      total_amount: totalAmount,
      sales_count:  salesCount,
      notes:        notes ?? null,
    })
    .select('id')
    .single()

  if (payError || !payment) throw new Error(payError?.message ?? 'Error al registrar pago')

  // 2. Marcar cada venta incluida en este pago con el ID del pago.
  //    Solo se marcan las que siguen pendientes (commission_payment_id IS NULL),
  //    así si ya hubo un pago anterior en el mismo rango, esas ventas no se tocan.
  const { error: updateError } = await supabase
    .from('sales')
    .update({ commission_payment_id: payment.id })
    .eq('user_id', sellerId)
    .gte('closed_at', periodStart)
    .lte('closed_at', periodEnd + 'T23:59:59')
    .is('commission_payment_id', null)
    .is('deleted_at', null)

  if (updateError) throw new Error(updateError.message)

  revalidatePath('/admin/commissions')
  revalidatePath('/seller/commissions')
}
