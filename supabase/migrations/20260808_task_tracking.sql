-- =============================================================
-- 20260808_task_tracking.sql
-- Suivi avancé des tâches : besoins, contraintes, lien projet
-- et journal des évolutions (task_updates)
-- =============================================================

-- Colonnes supplémentaires pour le suivi (besoins / contraintes / projet)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS needs TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS constraints TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS requester_name VARCHAR(255);

-- Journal des évolutions de tâches (statuts, commentaires)
CREATE TABLE IF NOT EXISTS task_updates (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id TEXT,
  actor_name VARCHAR(255),
  from_status VARCHAR(50),
  to_status VARCHAR(50),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_updates_task ON task_updates(task_id);
CREATE INDEX IF NOT EXISTS idx_task_updates_company ON task_updates(company_id);
