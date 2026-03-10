import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // All pages are dynamic — no static pre-rendering
  // (required because pages use Supabase auth)
  output: undefined,
}

export default nextConfig
