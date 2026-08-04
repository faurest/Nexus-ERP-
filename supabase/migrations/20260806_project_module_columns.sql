-- 20260806 : colonnes manquantes pour le module Projets (ProjectModule)
-- A appliquer dans le SQL Editor (règles RLS/autorisations inchangées)

-- projects : le formulaire envoie partnerId
ALTER TABLE projects ADD COLUMN IF NOT EXISTS partner_id TEXT;
CREATE INDEX IF NOT EXISTS idx_projects_partner ON projects(partner_id);

-- expenses : le formulaire dépense envoie projectId
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS project_id TEXT;
CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses(project_id);

-- sales_invoices : le formulaire facture envoie projectId, partnerId, description
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS project_id TEXT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS partner_id TEXT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS description TEXT;
CREATE INDEX IF NOT EXISTS idx_sales_invoices_project ON sales_invoices(project_id);

-- payments : le formulaire flux envoie projectId, type, description
ALTER TABLE payments ADD COLUMN IF NOT EXISTS project_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS description TEXT;
CREATE INDEX IF NOT EXISTS idx_payments_project ON payments(project_id);
