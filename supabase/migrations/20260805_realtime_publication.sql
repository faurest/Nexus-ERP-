-- Nexus ERP - Phase 4b : Activer le realtime (postgres_changes) pour onSnapshot
-- Sans cette publication, onSnapshot ne reçoit QUE l'émission initiale
-- (aucun événement après insert/update/delete) car les tables ne sont pas
-- dans la publication supabase_realtime.
-- À exécuter dans le SQL Editor du dashboard Supabase (projet xaugjedrxfgitjraymjj).

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'companies','personnel','clients','products','ecommerce_orders','order_history',
    'stock_history','notifications','tasks','leave_requests','time_entries',
    'salary_advances','projects','resources','services','sales','sales_invoices',
    'payments','expenses','open_orders','partners','support_tickets','messages',
    'project_discussions','order_messages','collaborations','guide_steps',
    'global_orders','interventions','users','resource_movements',
    'notification_configs','internal_resources'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      RAISE NOTICE 'realtime activé sur %', t;
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'déjà présent : %', t;
    END;
  END LOOP;
END $$;

-- Meilleure précision des événements UPDATE (l'app relit via getDocs, mais
-- l'identité complète évite les surprises avec les clés non triviales).
ALTER TABLE products REPLICA IDENTITY FULL;
ALTER TABLE companies REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
