// ============================================================
// CRM TYPE DEFINITIONS
// ============================================================

export type UserRole = 'admin' | 'seller'

export type LeadSource =
  | 'instagram'
  | 'tiktok'
  | 'website'
  | 'paid_ad'
  | 'referral'
  | 'other'

export type LeadStatus = 'available' | 'assigned' | 'closed' | 'lost'

export type ContactType = 'call' | 'whatsapp' | 'email' | 'meeting' | 'note'

// Vendor colors assigned automatically by registration order
export const VENDOR_COLORS = [
  { name: 'Azul',    bg: '#3B82F6', text: '#FFFFFF', light: '#EFF6FF' },
  { name: 'Amarillo',bg: '#EAB308', text: '#FFFFFF', light: '#FEFCE8' },
  { name: 'Verde',   bg: '#22C55E', text: '#FFFFFF', light: '#F0FDF4' },
  { name: 'Rojo',    bg: '#EF4444', text: '#FFFFFF', light: '#FEF2F2' },
  { name: 'Morado',  bg: '#A855F7', text: '#FFFFFF', light: '#FAF5FF' },
  { name: 'Naranja', bg: '#F97316', text: '#FFFFFF', light: '#FFF7ED' },
] as const

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  instagram:  'Instagram',
  tiktok:     'TikTok',
  website:    'Página web',
  paid_ad:    'Anuncio pagado',
  referral:   'Referido',
  other:      'Otro',
}

// ============================================================
// DATABASE TYPES (mirror of Supabase tables)
// ============================================================

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  color_index: number
  color_bg: string
  color_text: string
  color_light: string
  color_name: string
  is_active: boolean
  created_at: string
}

export interface PipelineStage {
  id: string
  name: string
  order_index: number
  is_initial: boolean
  is_closed_won: boolean
  is_closed_lost: boolean
  created_at: string
}

export interface Lead {
  id: string
  name: string
  email: string
  phone: string
  source: LeadSource
  status: LeadStatus
  stage_id: string | null
  assigned_to: string | null
  estimated_value: number | null
  close_probability: number | null
  notes: string | null
  next_action: string | null
  next_action_date: string | null
  last_contact_at: string | null
  taken_at: string | null
  closed_at: string | null
  created_at: string
  // Joined
  stage?: PipelineStage
  assignee?: Profile
}

export interface FollowUp {
  id: string
  lead_id: string
  user_id: string
  contact_type: ContactType
  note: string
  next_action: string | null
  created_at: string
  // Joined
  user?: Profile
}

export interface Sale {
  id: string
  lead_id: string
  user_id: string
  value: number
  product: string
  notes: string | null
  closed_at: string
  // Joined
  lead?: Lead
  user?: Profile
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number | null
  is_active: boolean
  created_at: string
}

// ============================================================
// UI / FORM TYPES
// ============================================================

export interface LeadCaptureFormData {
  name: string
  email: string
  phone: string
  source: LeadSource
}

export interface CloseSaleFormData {
  value: number
  product: string
  notes?: string
}

export interface FollowUpFormData {
  contact_type: ContactType
  note: string
  next_action?: string
  next_action_date?: string
}

export interface SellerMetrics {
  leads_taken: number
  leads_in_progress: number
  sales_closed: number
  total_value: number
  conversion_rate: number
}

export interface AdminMetrics {
  total_leads: number
  available_leads: number
  leads_by_source: Record<LeadSource, number>
  total_sales: number
  total_value: number
  sellers: (Profile & SellerMetrics)[]
}
