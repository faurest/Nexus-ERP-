-- =============================================================================
-- PHASE 3 FIX: Fix inconsistent columns + create ONLY missing tables
-- =============================================================================

-- 1. FIX: expenses has "companyid" instead of "company_id"
-- =============================================================================
ALTER TABLE expenses RENAME COLUMN companyid TO company_id;

-- 2. FIX: interventions has "companyId" instead of "company_id"
-- =============================================================================
ALTER TABLE interventions RENAME COLUMN "companyId" TO company_id;

-- 3. Add missing columns to existing tables
-- =============================================================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS objectives TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo TEXT;

ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_threshold INT DEFAULT 5;

ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS customer_quartier VARCHAR(255);
ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS operator VARCHAR(50);
ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS delivery_location VARCHAR(255);
ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL DEFAULT 0;
ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ;
ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS checkout_source VARCHAR(50);
ALTER TABLE ecommerce_orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ;

ALTER TABLE interventions ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Create ONLY the missing tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL DEFAULT 'Equipment',
  quantity INT NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Available',
  location VARCHAR(255),
  condition VARCHAR(100),
  duration VARCHAR(100),
  warranty VARCHAR(255),
  price DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_resources_company ON resources(company_id);

CREATE TABLE IF NOT EXISTS sales_invoices (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sale_id TEXT,
  order_id TEXT,
  invoice_number VARCHAR(100),
  amount DECIMAL NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  client_name VARCHAR(255),
  table_number VARCHAR(50),
  items JSONB,
  date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_company ON sales_invoices(company_id);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_id TEXT,
  invoice_id TEXT,
  amount DECIMAL NOT NULL DEFAULT 0,
  method VARCHAR(50) DEFAULT 'CASH',
  status VARCHAR(50) DEFAULT 'completed',
  customer_name VARCHAR(255),
  notes TEXT,
  date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);

CREATE TABLE IF NOT EXISTS open_orders (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  items JSONB,
  total DECIMAL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_open_orders_company ON open_orders(company_id);

CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) DEFAULT 'supplier',
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_partners_company ON partners(company_id);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(50) DEFAULT 'NORMAL',
  status VARCHAR(50) DEFAULT 'PENDING',
  user_email VARCHAR(255),
  responses JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_company ON support_tickets(company_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  conversation_id VARCHAR(500) NOT NULL,
  sender_id VARCHAR(255),
  sender_email VARCHAR(255),
  recipient_id VARCHAR(255),
  recipient_email VARCHAR(255),
  sender_name VARCHAR(255),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_company ON messages(company_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

CREATE TABLE IF NOT EXISTS project_discussions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  sender_id VARCHAR(255),
  sender_name VARCHAR(255),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_discussions_company ON project_discussions(company_id);
CREATE INDEX IF NOT EXISTS idx_project_discussions_project ON project_discussions(project_id);

CREATE TABLE IF NOT EXISTS order_messages (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  sender_id VARCHAR(255),
  sender_name VARCHAR(255),
  recipient_id VARCHAR(255),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_messages_company ON order_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_order ON order_messages(order_id);

CREATE TABLE IF NOT EXISTS collaborations (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'Note',
  title VARCHAR(255) NOT NULL,
  content TEXT,
  reference_id TEXT,
  file_url TEXT,
  file_name VARCHAR(255),
  sender_email VARCHAR(255),
  read_by JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_collaborations_company ON collaborations(company_id);

CREATE TABLE IF NOT EXISTS guide_steps (
  id TEXT PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  keywords JSONB DEFAULT '[]'::jsonb,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS global_orders (
  id TEXT PRIMARY KEY,
  total DECIMAL NOT NULL DEFAULT 0,
  cart_total DECIMAL DEFAULT 0,
  total_delivery_fees DECIMAL DEFAULT 0,
  delivery_discount DECIMAL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'PENDING',
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'UNPAID',
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_quartier VARCHAR(255),
  customer_email VARCHAR(255),
  sub_order_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Trigger: auto-update updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t2 ON c.table_name = t2.table_name
    WHERE c.column_name = 'updated_at'
      AND c.table_schema = 'public'
      AND t2.table_schema = 'public'
      AND t2.table_type = 'BASE TABLE'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_' || tbl
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER set_updated_at_%I BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        tbl, tbl
      );
    END IF;
  END LOOP;
END;
$$;

SELECT 'PHASE 3 FIX applied successfully' AS status;
