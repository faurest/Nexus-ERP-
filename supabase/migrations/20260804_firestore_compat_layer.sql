-- Nexus ERP - Phase 4 : Compat Layer Firestore -> Supabase
-- Ajoute les colonnes manquantes attendues par le code (camelCase -> snake_case)
-- et crée les 3 tables manquantes référencées par l'application.
-- À exécuter dans le SQL Editor du dashboard Supabase (projet xaugjedrxfgitjraymjj).

-- ============================================================
-- 1. COLONNES MANQUANTES SUR LES TABLES EXISTANTES
-- ============================================================

-- companies : membres / employés (jsonb = tableaux d'objets/emails)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS member_emails jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employees jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS members jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nexus_commission_rate numeric DEFAULT 0;

-- clients : interactions / uid / statut (écrits par ClientModule & repos)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS interactions text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS uid text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status text;

-- products : options de configuration (jsonb)
ALTER TABLE products ADD COLUMN IF NOT EXISTS config_options jsonb;

-- ecommerce_orders : sous-total / commission Nexus
ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS subtotal numeric;
ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS nexus_commission numeric;

-- projects : champs d'édition avancés
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget numeric;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date timestamptz;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date timestamptz;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress numeric DEFAULT 0;

-- tasks : champs d'édition avancés
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- users : table avec colonnes camelCase + colonnes manquantes + fid (id Firestore)
ALTER TABLE users ADD COLUMN IF NOT EXISTS "photoURL" text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLogin" timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "status" text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fid text;
CREATE UNIQUE INDEX IF NOT EXISTS users_fid_key ON users (fid) WHERE fid IS NOT NULL;

-- ============================================================
-- 2. TABLES MANQUANTES
-- ============================================================

-- resource_movements : mouvements de ressources (ResourceModule)
CREATE TABLE IF NOT EXISTS resource_movements (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  resource_id TEXT,
  resource_name TEXT,
  type TEXT,
  quantity numeric,
  supplier TEXT,
  notes TEXT,
  performed_by TEXT,
  date timestamptz,
  created_at timestamptz DEFAULT NOW()
);

-- notification_configs : configuration notifications e-commerce (EcommerceModule)
CREATE TABLE IF NOT EXISTS notification_configs (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  active_channel TEXT,
  sender_number TEXT,
  cancel_template TEXT,
  shipped_template TEXT,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- internal_resources : ressources internes de l'entreprise (EcommerceModule)
CREATE TABLE IF NOT EXISTS internal_resources (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name TEXT,
  type TEXT,
  status TEXT,
  assigned_to TEXT,
  acquisition_date timestamptz,
  purchase_value numeric,
  last_maintenance_date timestamptz,
  created_at timestamptz DEFAULT NOW()
);
