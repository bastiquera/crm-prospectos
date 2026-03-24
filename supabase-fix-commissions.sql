-- ============================================================
-- FIX COMPLETO: Sistema de comisiones
-- Ejecutar TODO en Supabase → SQL Editor
-- Es seguro ejecutar múltiples veces (usa IF NOT EXISTS)
-- ============================================================

-- 1. Agregar columna commission_percentage a products (si no existe)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 0;

-- 2. Agregar columnas de comisión a sales (si no existen)
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 0;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 3. Agregar commission_payment_id a sales (si no existe)
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS commission_payment_id UUID
    REFERENCES commission_payments(id)
    ON DELETE SET NULL;

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_sales_commission_payment_id
  ON sales(commission_payment_id);

CREATE INDEX IF NOT EXISTS idx_sales_unpaid_by_seller
  ON sales(user_id, commission_payment_id, closed_at)
  WHERE commission_payment_id IS NULL;

-- 5. Actualizar commission_amount en ventas existentes
--    según el % guardado en cada venta
UPDATE sales
SET commission_amount = ROUND(value * commission_percentage / 100, 2)
WHERE commission_percentage > 0
  AND commission_amount = 0;

-- ============================================================
-- VERIFICACIÓN: ejecuta esto para confirmar que todo está OK
-- ============================================================
SELECT
  COUNT(*) AS total_ventas,
  COUNT(*) FILTER (WHERE commission_amount > 0) AS ventas_con_comision,
  SUM(commission_amount) AS total_comisiones,
  COUNT(*) FILTER (WHERE commission_payment_id IS NULL) AS ventas_pendientes,
  COUNT(*) FILTER (WHERE commission_payment_id IS NOT NULL) AS ventas_pagadas
FROM sales;
