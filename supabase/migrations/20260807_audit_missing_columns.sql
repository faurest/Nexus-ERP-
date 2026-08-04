-- 20260807_audit_missing_columns.sql
-- Colonnes manquantes détectées par l'audit des écritures de l'application
-- (modules Admin, Ecommerce, Sales, Project, Prestations) contre le schéma réel.
-- À exécuter dans le SQL Editor de Supabase.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE services ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS type VARCHAR(50);

ALTER TABLE open_orders ADD COLUMN IF NOT EXISTS table_number VARCHAR(50);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference TEXT;

ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_backorder BOOLEAN DEFAULT false;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'member';
