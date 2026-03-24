-- ============================================================
-- MIGRACIÓN: SISTEMA DE COMISIONES
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- 1. Agregar % de comisión a productos
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 0;

-- 2. Agregar snapshot de comisión en ventas
--    Estos campos capturan el % y monto al momento de cerrar la venta.
--    Si el admin cambia el % de un producto después, las ventas anteriores NO se ven afectadas.
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount     DECIMAL(10,2) NOT NULL DEFAULT 0;

-- 3. Crear tabla de pagos de comisiones
CREATE TABLE IF NOT EXISTS commission_payments (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id     UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  paid_by       UUID          NOT NULL REFERENCES profiles(id),
  period_start  DATE          NOT NULL,
  period_end    DATE          NOT NULL,
  total_amount  DECIMAL(10,2) NOT NULL,
  sales_count   INTEGER       NOT NULL DEFAULT 0,
  notes         TEXT,
  paid_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 4. Habilitar RLS en commission_payments
ALTER TABLE commission_payments ENABLE ROW LEVEL SECURITY;

-- Admin puede hacer todo
CREATE POLICY "admin_commission_payments_all"
  ON commission_payments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Vendedora solo puede leer sus propios pagos
CREATE POLICY "seller_commission_payments_read_own"
  ON commission_payments FOR SELECT
  USING (seller_id = auth.uid());

-- ============================================================
-- FIN DE MIGRACIÓN
-- ============================================================
