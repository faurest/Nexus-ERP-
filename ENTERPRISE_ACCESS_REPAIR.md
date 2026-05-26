# NEXUS ERP - REPAIR & DIAGNOSTICS ARCHITECTURE
**Rôle:** Principal Backend Reliability & Security Engineer
**Sujet:** Diagnostic Automatique des Blocages d'Accès ("EMPLOYEE Lockout")

Même dans une architecture SaaS SAGA, des blocages peuvent survenir suite à un crash asynchrone non détecté (CAS 1, 2, 3), ou par déclassement du `Readiness Checker` face à un RLS. J'ai conçu le module `core/diagnostics` pour résoudre la plainte de l'EMPLOYEE (`dangafelicite@gmail.com`) au sein de JET 7 INFO, en respectant la sécurité Supabase stricte.

## L'Architecture Auto-Guérisseuse (Auto-Healing Diagnostic)
Le script ne détruit jamais. Il ré-exécute les composants de la Saga de manière **Idempotente** selon le Root Cause Analysis (RCA) calculé en direct.

### Les 4 Cas de Diagnostic ("Drift Cases") :
1. **CASE_1_MEMBERSHIP_MISSING** : L'ID est là, mais aucune jointure (row dans `memberships`).
2. **CASE_2_RLS_INVISIBLE** : La row existe, mais son statut est suspendu ou le Context JWT n'arrive pas à mapper. Le `RLSVisibilityTester` renvoie `false` sur le SELECT de la table concernée.
3. **CASE_3_SAGA_INCOMPLETE** : L'Assignation n'a rien généré. Le User n'existe même pas. L'Engine va ré-invoquer le `SupabaseBootstrapRepo.createMembershipByEmailIdempotent`.
4. **CASE_4_READINESS_INCOHERENT** : Les droits locaux sont bons, mais le backend SQL (`is_tenant_fully_ready()`) s'oppose (ex: L'Owner n'existe pas).

### Workflow de Réparation
Dès que l'`AccessRepairEngine` identifie et corrige la faille (par exemple UPSERT de l'EMPLOYEE manquant), il ne se contente pas de retourner True. Il invoque le `ReadinessReconciler`, qui à son tour va ordonner au **ConsistencyAutoHealer** de mettre à jour le système temps réel (Firebase + Frontend State), débloquant instantanément le Dashboard pour l'utilisateur, tout cela de façon silencieuse et transactionnelle.
