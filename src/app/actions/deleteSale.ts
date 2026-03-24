'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function deleteSale(saleId: string): Promise<{ success?: boolean; error?: string }> {
  // 1. Verify the caller is an admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'Sin permisos de administrador' }

  // 2. Use admin client (bypasses RLS) to perform the deletion
  const admin = createAdminClient()

  // Get the sale's lead_id before deleting
  const { data: sale, error: fetchError } = await admin
    .from('sales')
    .select('lead_id')
    .eq('id', saleId)
    .single()

  if (fetchError || !sale) return { error: 'Venta no encontrada' }

  // Soft delete: mark as deleted instead of physically removing
  const { error: deleteError } = await admin
    .from('sales')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', saleId)

  if (deleteError) return { error: deleteError.message }

  // 3. Check if this lead has any remaining active sales
  const { data: remaining } = await admin
    .from('sales')
    .select('id')
    .eq('lead_id', sale.lead_id)
    .is('deleted_at', null)

  if (!remaining || remaining.length === 0) {
    // No more sales → revert lead back to active pipeline
    const { data: stages } = await admin
      .from('pipeline_stages')
      .select('id')
      .eq('is_initial', false)
      .eq('is_closed_won', false)
      .eq('is_closed_lost', false)
      .order('order_index', { ascending: false })
      .limit(1)

    await admin
      .from('leads')
      .update({
        status:          'assigned',
        closed_at:       null,
        estimated_value: null,
        stage_id:        stages?.[0]?.id ?? null,
      })
      .eq('id', sale.lead_id)
  }

  // 4. Revalidate all affected pages
  revalidatePath('/admin/sales')
  revalidatePath('/admin')
  revalidatePath('/admin/metrics')
  revalidatePath('/admin/leads')

  return { success: true }
}
