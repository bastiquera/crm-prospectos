import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LeadDetailView } from '@/components/leads/LeadDetailView'
import type { Lead, Profile, FollowUp } from '@/types'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: lead }, { data: followUps }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('leads')
      .select('*, stage:pipeline_stages(*), assignee:profiles!leads_assigned_to_fkey(*)')
      .eq('id', id)
      .single(),
    supabase.from('follow_ups')
      .select('*, user:profiles(*)')
      .eq('lead_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!lead) notFound()
  if (lead.assigned_to !== user!.id) redirect('/seller')

  return (
    <LeadDetailView
      lead={lead as Lead}
      profile={profile as Profile}
      followUps={(followUps ?? []) as FollowUp[]}
    />
  )
}
