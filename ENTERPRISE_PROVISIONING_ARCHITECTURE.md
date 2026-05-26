# NEXUS ERP - ARCHITECTURE WORKSPACE & TENANT PROVISIONING

**Rôle :** Principal Backend Architect / SaaS ERP Specialist
**Sujet :** Création et Orchestration Multi-Tenant (Phase Provisioning)

---

## 1. ARCHITECTURE BACKEND (Tenant Provisioning Module)

Le nouveau système de provisioning a été découpé selon les principes du **Domain-Driven Design (DDD)** :
- **Domain Layer :** Modèles (Company) et `TenantStateMachine` (la machine à état de provisioning).
- **Orchestration Layer :** `ProvisioningOrchestrator`, le chef d'orchestre transactionnel.
- **Application Layer :** `CreateCompanyUseCase` pour encapsuler l'exécution.
- **Infrastructure Layer :** `SupabaseRepo` (Source de vérité) et `FirebaseRepo` (Méta-données Realtime).

Toute la logique a été centralisée dans `src/core/tenant-provisioning/`.

## 2. STATE MACHINE DU PROVISIONING

Le flux de création (`TenantStateMachine`) :
1. `CREATION_INIT` : Initialisation du contexte utilisateur et Retry Count.
2. `VALIDATION` : Vérification des métadonnées (Nom valide, User UID présent).
3. `PERMISSION_CHECK` : Vérification des droits globaux / quotas.
4. `COMPANY_CREATION` : Insertion de l'entreprise dans Supabase.
5. `WORKSPACE_CREATION` : Création du Workspace par défaut.
6. `MEMBERSHIP_CREATION` : Attribution du Rôle "Owner".
7. `SYNC_LAYER` : Duplication minimale des métadonnées sous Firebase pour le routing temps réel.
8. `TENANT_UPDATE` : Mise à jour du state manager in-memory.
9. `CACHE_INVALIDATION` : Nettoyage de la Single-Page-App avant la permutation de locataire.
10. `TENANT_SWITCH` : Switch UI automatique.
11. `COMPLETED` : Provisioning terminé.

## 3. ORCHESTRATEUR TRANSACTIONNEL & ROLLBACK

L'orchestrateur `ProvisioningOrchestrator.ts` est conçu pour gérer l'échec et éviter des états partiels orphelins :
- En cas d'erreur réseau sur Supabase (`COMPANY_CREATION`), l'état passe en `ERROR_DB`.
- En cas d'erreur de synchronisation Firebase (`SYNC_LAYER`), l'orchestrateur attrape l'exception, déclenche un **Rollback** via `SupabaseRepo.rollbackCompany()`, et passe en `ERROR_SYNC`.
- Ce mécanisme garantit qu'aucune entreprise n'existe dans Supabase sans ses entités Firebase respectives.

## 4. DESIGN DES TABLES SUPABASE (Source of Truth)

**Table `companies` :**
- `id` (PK, string)
- `name` (string)
- `owner_id` (FK -> users.uid)
- **RLS :** `auth.uid() = owner_id OR auth.uid() IN (SELECT user_id FROM memberships WHERE company_id = companies.id)`

**Table `workspaces` :**
- `id` (PK, string)
- `company_id` (FK -> companies.id)
- `name` (string)

**Table `memberships` :**
- `id` (PK)
- `company_id` (FK -> companies.id)
- `user_id` (FK -> users.uid)
- `role` (enum: 'owner', 'admin', 'employee')
- `status` (string: 'active')
- **RLS :** Accès limité aux membres actifs.

## 5. GESTION DES ERREURS : RETRY ET OFFLINE

- **Mode Offline (Afrique/Mobilité) :** Le provisioning exige une requête atomique backend. Si l'appareil est Offline, le bouton de création d'entreprise est grisé ou stocke l'intention de création dans la file d'attente (SyncRuntime - introduite précédemment) qui tentera de déclencher le call au retour réseau.
- **Idempotence :** Le backend génère des IDs uniques basés sur des UUIDs client côté Orchestrateur pour s'assurer qu'un double clic accidentel (3G lag) ne crée pas 2 entreprises. 

## 6. SÉCURITÉ ET VALIDATION RLS (MULTI-TENANT)

- **Zéro Trust Frontend :** Le frontend ne fait plus de simples `insert().into('companies')`. L'API backend ou l'orchestrateur protégé prend en main l'insertion, limitant le risque de manipulation d'IDs.
- Le `TenantSecurityManager` (créé lors de la phase Runtimes) garantit qu'une fois la société créée, l'utilisateur passe dans le contexte isolé, et toutes les requêtes subséquentes au Supabase injectent ce contexte locatif via le JWT ou le path `company_id`.

## 7. INTÉGRATION SANS RÉGRESSION

- Le code a été placé dans `src/core/tenant-provisioning/` et ne remplace pas d'un coup l'ancien flux `companies.api.ts` immédiatement pour les views existantes, afin de respecter le **Strangler Fig Pattern**. 
- L'adoption se fera en pointant `CreateCompanyUseCase` sur le bouton final d'onboarding, basculant les nouveaux utilisateurs vers ce flux 100% transactionnel et synchronisé.
