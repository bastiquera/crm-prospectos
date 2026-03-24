'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  /** Supabase table names to watch for any row changes */
  tables: string[]
}

/**
 * Invisible client component that subscribes to Supabase Realtime
 * and triggers a Next.js server re-render (router.refresh) whenever
 * data changes in any of the specified tables.
 *
 * Drop it inside any Server Component page to get live updates.
 */
export function RealtimeRefresher({ tables }: Props) {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Debounce so rapid batch changes only trigger one refresh
    function scheduleRefresh() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => router.refresh(), 350)
    }

    const channels = tables.map((table) =>
      supabase
        .channel(`rt-refresher-${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          scheduleRefresh
        )
        .subscribe()
    )

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      channels.forEach((ch) => supabase.removeChannel(ch))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
