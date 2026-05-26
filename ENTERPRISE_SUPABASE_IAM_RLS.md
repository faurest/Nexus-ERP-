# NEXUS ERP - SUPABASE IAM & RLS (MULTI-TENANT ISOLATION)
**Rôle:** Principal Backend Security Architect
**Sujet:** Sécurisation RLS absolue et Intégrité Transactionnelle Multi-Tenant

Le multi-tenancy SaaS ne peut pas reposer uniquement sur du masquage Front-End (React Router, Firebase Client listeners). La sécurité ultime exige que la base de données source (Supabase) protège la donnée coûte que coûte, même face à une requête falsifiée. 

## 1. Row Level Security (RLS) Stricte
Le script de migration `20260526000000_multi_tenant_iam_rls.sql` applique les principes de *AWS IAM* ou *Stripe Connect* :
- **is_member_of()** : Une fonction PostgreSQL `SECURITY DEFINER` tournant avec privilèges élevés pour vérifier les accès (membres actifs).
- **Lectures Bridées** : Les tables `companies`, `workspaces`, `users`, et `memberships` ne renverront jamais de données si le token `auth.uid()` n'appartient pas à l'entreprise demandée via une jointure vérifiée par `SECURITY DEFINER`. L'isolation est inforensique.

## 2. Blocage des Écritures Front-End
L'architecture interdit toute écriture client sur la table `memberships`.
```sql
CREATE POLICY "insert_membership_blocked" ON public.memberships FOR INSERT WITH CHECK (false);
```
Un utilisateur ne "rejoint" pas une entreprise. C'est l'Orchestrateur (SAGA backend) agissant avec un privilège *Service Role* qui forge les permissions de manière consistante. 

## 3. SQL Readiness Gate (Validation Finale)
L'état d'un Tenant n'est prouvé qu'en base. Nous avons défini des requêtes transactionnelles pures dans PostgreSQL :
- `check_owner_exists()`
- `check_employee_exists()`
- `is_tenant_fully_ready()` : Porte logique finale.

## 4. Lien avec le Verdict Engine (SAGA)
Le Verdict Engine de l'Observabilité a été mis à jour pour être un processus *Asynchrone* (`generateVerdictAsync`).
Même si le script Frontend jure que la transaction a réussi (`VERIFIED_SUCCESS`), le Verdict Engine exécute un hook ultime via `SupabaseReadinessChecker.isTenantFullyReady(companyId)`. 
Si la base PostgreSQL (Supabase IAM) rejette l'intégrité (ex: un OWNER est enregistré, mais pas l'EMPLOYEE et nous imposions un full set), le verdict est instantanément invalidé en `DATA_INCONSISTENCY` provoquant le déclenchement du `Continuous Consistency Watchdog` pour geler l'Interface Utilisateur (via le CEG).

Une architecture purement inattaquable.
