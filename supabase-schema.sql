-- ============================================================
-- CRM DATABASE SCHEMA
-- Ejecutar en Supabase SQL Editor (en orden)
-- ============================================================

-- 1. PROFILES (extends auth.users)
CREATE TABLE public.profiles (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'seller' CHECK (role IN ('admin', 'seller')),
  color_index   INTEGER DEFAULT 0,
  color_bg      TEXT DEFAULT '#3B82F6',
  color_text    TEXT DEFAULT '#FFFFFF',
  color_light   TEXT DEFAULT '#EFF6FF',
  color_name    TEXT DEFAULT 'Azul',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PIPELINE STAGES
CREATE TABLE public.pipeline_stages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  order_index     INTEGER NOT NULL,
  is_initial      BOOLEAN DEFAULT false,
  is_closed_won   BOOLEAN DEFAULT false,
  is_closed_lost  BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. LEADS
CREATE TABLE public.leads (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT NOT NULL,
  source              TEXT NOT NULL DEFAULT 'other'
                        CHECK (source IN ('instagram','tiktok','website','paid_ad','referral','other')),
  status              TEXT NOT NULL DEFAULT 'available'
                        CHECK (status IN ('available','assigned','closed','lost')),
  stage_id            UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  assigned_to         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  estimated_value     DECIMAL(12,2),
  close_probability   INTEGER CHECK (close_probability BETWEEN 0 AND 100),
  notes               TEXT,
  next_action         TEXT,
  next_action_date    TIMESTAMPTZ,
  last_contact_at     TIMESTAMPTZ,
  taken_at            TIMESTAMPTZ,
  closed_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FOLLOW UPS
CREATE TABLE public.follow_ups (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id       UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  contact_type  TEXT NOT NULL DEFAULT 'note'
                  CHECK (contact_type IN ('call','whatsapp','email','meeting','note')),
  note          TEXT NOT NULL,
  next_action   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SALES
CREATE TABLE public.sales (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id     UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  value       DECIMAL(12,2) NOT NULL,
  product     TEXT NOT NULL,
  notes       TEXT,
  closed_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEFAULT PIPELINE STAGES
-- ============================================================
INSERT INTO public.pipeline_stages (name, order_index, is_initial, is_closed_won, is_closed_lost)
VALUES
  ('Leads nuevos',      1, true,  false, false),
  ('Contactado',        2, false, false, false),
  ('En negociación',    3, false, false, false),
  ('Propuesta enviada', 4, false, false, false),
  ('Venta cerrada',     5, false, true,  false),
  ('Perdido',           6, false, false, true);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales         ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- PIPELINE STAGES — todos pueden leer, solo admin escribe
CREATE POLICY "stages_select" ON public.pipeline_stages
  FOR SELECT USING (true);

CREATE POLICY "stages_write_admin" ON public.pipeline_stages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- LEADS — lógica first-come-first-served
CREATE POLICY "leads_select_available" ON public.leads
  FOR SELECT USING (
    status = 'available'
    OR assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "leads_insert_public" ON public.leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "leads_update_assigned" ON public.leads
  FOR UPDATE USING (
    assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (status = 'available' AND assigned_to IS NULL)
  );

-- FOLLOW UPS
CREATE POLICY "followups_select" ON public.follow_ups
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "followups_insert" ON public.follow_ups
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- SALES
CREATE POLICY "sales_select" ON public.sales
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "sales_insert" ON public.sales
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================
-- FUNCTION: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  vendor_count INTEGER;
  color_idx    INTEGER;
  colors       JSONB := '[
    {"bg":"#3B82F6","text":"#FFFFFF","light":"#EFF6FF","name":"Azul"},
    {"bg":"#EAB308","text":"#FFFFFF","light":"#FEFCE8","name":"Amarillo"},
    {"bg":"#22C55E","text":"#FFFFFF","light":"#F0FDF4","name":"Verde"},
    {"bg":"#EF4444","text":"#FFFFFF","light":"#FEF2F2","name":"Rojo"},
    {"bg":"#A855F7","text":"#FFFFFF","light":"#FAF5FF","name":"Morado"},
    {"bg":"#F97316","text":"#FFFFFF","light":"#FFF7ED","name":"Naranja"}
  ]';
  chosen_color JSONB;
BEGIN
  -- Count existing sellers to assign next color
  SELECT COUNT(*) INTO vendor_count
  FROM public.profiles
  WHERE role = 'seller';

  color_idx := vendor_count % 6;
  chosen_color := colors->color_idx;

  INSERT INTO public.profiles (id, email, full_name, role, color_index, color_bg, color_text, color_light, color_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'seller'),
    color_idx,
    chosen_color->>'bg',
    chosen_color->>'text',
    chosen_color->>'light',
    chosen_color->>'name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ENABLE REALTIME on leads table (for live updates)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_stages;
