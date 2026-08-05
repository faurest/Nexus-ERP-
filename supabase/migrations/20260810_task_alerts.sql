-- =============================================================
-- 20260810_task_alerts.sql
-- Alertes automatiques sur les tâches : rappels d'échéance
-- et escalade des tâches bloquées (marqueurs d'envoi)
-- =============================================================

-- Marqueur : début du blocage (posé automatiquement au passage en 'blocked')
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocked_since TIMESTAMPTZ;

-- Marqueurs anti-doublon des alertes automatiques (max 1 envoi / 24h)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS escalation_sent_at TIMESTAMPTZ;
