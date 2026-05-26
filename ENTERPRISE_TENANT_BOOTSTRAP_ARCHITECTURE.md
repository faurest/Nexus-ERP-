# NEXUS ERP - ARCHITECTURE BOOTSTRAP TENANT (Phase Provisioning Avancé)

**Rôle :** Principal Backend Architect
**Sujet :** Création résiliente, idempotente et asynchrone des entreprises.

## 1. STRATÉGIE DE BOOTSTRAP "FAIL-SAFE"

Le module `tenant-bootstrap/` est conçu spécifiquement pour le contexte instable des mobiles africains (WebView, 3G, micro-coupures). 
Contrairement à un CRUD classique, il gère la création comme une **Transaction Distribuée** qui peut s'interrompre et reprendre.

**Scope Strict :** `src/core/tenant-bootstrap/`

## 2. COMPOSANTS ARCHITECTURAUX

- **BootstrapStateMachine :** Définit strictement les états de flux (INIT -> BOOTSTRAP_STARTED -> COMPANY_CREATED -> SYNC_FIREBASE -> COMPLETED).
- **BootstrapOrchestrator :** Fonctionne comme un SAGA pattern rudimentaire. Il effectue l'orchestration pas à pas. En cas d'erreur de réseau temporaire, il retente (jusqu'à 3 fois). En cas d'échec définitif au niveau `SYNC_FIREBASE`, il ordonne un **Rollback** à `Supabase` pour éviter les *Ghost Tenants* (entreprises sans Firebase realtime, donc cassées).
- **RecoveryManager :** Utilise le `localStorage` de manière très agressive. Il sauvegarde le `BootstrapContext` après chaque étape réussie (Checkpoints). 
  - Si l'utilisateur perd sa connexion et ferme son onglet : au retour, le système repère un job de bootstrap non fini, et reprend à l'étape exacte (Idempotence).
- **Idempotency Keys :** La création de l'ID d'entreprise sous Supabase `SupabaseBootstrapRepo` n'est plus aléatoire côté serveur ; elle inclut un hash base sur l'`idempotencyKey` injecté au début, empéchant un double-clic (double envoi réseau) de créer 2 tenants.

## 3. GARANTIES DU SYSTÈME

1. **Anti Double-Création (Idempotence) :** Tolérance absolue des "Submit" frénétiques.
2. **Crash & Resume :** Le rechargement de page ou l'extinction du mobile Android low-end en pleine requête n'entraîne aucune corruption.
3. **Sécurité et RLS :** Supabase agit en Source of Truth. Firebase n'est hydraté que **SI ET SEULEMENT SI** Supabase valide l'insertion.
4. **Cohérence du Cache :** Une fois provisionné, le système invoque le `TenantRuntime` pour effacer les requêtes locales de l'ancien profil (SaaS isolation) AVANT d'hydrater Zustand. Pas de leak UI possible.

## 4. INTÉGRATION UX (Mobile Africa)

Toute la charge est backend. L'UI qui l'invoquera n'aura pas à gérer de hooks compliqués, juste afficher une jauge de progression s'appuyant sur l'état du `BootstrapStateMachine`, en gardant l'écran dynamique et en masquant la latence transactionnelle.
