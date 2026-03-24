-- ============================================================
-- MIGRACIÓN: Vincular ventas a pagos de comisión
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- 1. Agregar columna que vincula cada venta con el pago que la liquidó
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS commission_payment_id UUID
    REFERENCES commission_payments(id)
    ON DELETE SET NULL;

-- 2. Índice para acelerar consultas de ventas sin pagar
CREATE INDEX IF NOT EXISTS idx_sales_commission_payment_id
  ON sales(commission_payment_id);

-- 3. Índice compuesto para el filtro más común:
--    vendedora + sin pagar + fecha
CREATE INDEX IF NOT EXISTS idx_sales_unpaid_by_seller
  ON sales(user_id, commission_payment_id, closed_at)
  WHERE commission_payment_id IS NULL;

-- ============================================================
-- FIN DE MIGRACIÓN
-- ============================================================
