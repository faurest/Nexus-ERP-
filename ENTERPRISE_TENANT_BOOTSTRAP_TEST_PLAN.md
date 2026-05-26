# NEXUS ERP - MASTER TEST PLAN : TENANT BOOTSTRAP

**Rôle :** Senior QA Architect & Backend Reliability Engineer
**Composant :** `tenant-bootstrap` (Création entreprise multi-tenant)

Ce document définit la stratégie complète de validation (Unit, Integration, E2E, Chaos, Security, Offline) pour garantir une fiabilité totale, 100% fail-safe et idempotente, du flux de provisioning des entreprises sur Nexus ERP, spécialement pour les connexions 3G africaines instables.

---

## 1. UNIT TESTS (State Machine Transitions)

**Cible :** `BootstrapStateMachine`
**Objectif :** S'assurer que le graphe d'états interne ne permet pas de transitions frauduleuses ou impossibles, et comptabilise correctement l'historique et les retries.

*   **Scénario 1.1 : Transition Standard**
    *   **GIVEN** L'état est `BOOTSTRAP_INIT`
    *   **WHEN** On transitionne vers `AUTH_VALIDATED`
    *   **THEN** L'état devient `AUTH_VALIDATED` et l'historique enregistre les deux états.
*   **Scénario 1.2 : Retry Count**
    *   **GIVEN** L'état est instancié
    *   **WHEN** La fonction `incrementRetry()` est appelée 3 fois
    *   **THEN** `context.retryCount` vaut `3`.
*   **Scénario 1.3 : Validation des Contextes Initiaux**
    *   **GIVEN** Un utilisateur déclenche la machine
    *   **WHEN** L'idempotencyKey est passée dans les arguments
    *   **THEN** Le contexte conserve strictement la clé d'idempotence pour un usage ultérieur.

---

## 2. INTEGRATION TESTS (Backend Orchestrator)

**Cible :** `BootstrapOrchestrator`
**Objectif :** Tester la logique transactionnelle (SAGA) entre Supabase et Firebase avec les mocks associés pour vérifier le Happy Path, le Rollback et l'Idempotence.

*   **Scénario 2.1 : Happy Path Complet**
    *   **GIVEN** Supabase et Firebase répondent avec succès en < 200ms
    *   **WHEN** `startBootstrap` est appelé
    *   **THEN** Supabase (Company, Workspace, Membership) et Firebase (Sync) sont hydratés. La fonction retourne `company_id`.
*   **Scénario 2.2 : Échec Sync Firebase (SAGA Rollback)**
    *   **GIVEN** Supabase répond avec succès, Firebase lève une erreur `timeout`
    *   **WHEN** L'orchestrateur atteint `SYNC_FIREBASE`
    *   **THEN** Firebase lance l'exception, l'orchestrateur attrape l'erreur, appelle `SupabaseBootstrapRepo.rollbackCompany()`, passe en `ERROR_SYNC` et sauvegarde l'échec dans `RecoveryManager`.
*   **Scénario 2.3 : Idempotence (Double Clic UI)**
    *   **GIVEN** Un utilisateur clique deux fois (envoi de 2 appels en parallèle avec un même `userId`)
    *   **WHEN** Le `SupabaseBootstrapRepo` tente l'insertion
    *   **THEN** Le composant backend d'idempotence détecte la clé dupliquée et renvoie le même ID de compagnie sans créer de second enregistrement.

---

## 3. E2E TESTS (Real User Flow)

**Cible :** Moteur E2E (Type Playwright / Cypress)

*   **Scénario 3.1 : UX non-bloquante**
    *   **GIVEN** Le réseau est lent (Throttling 3G Slow)
    *   **WHEN** L'utilisateur clique sur "Créer l'entreprise"
    *   **THEN** Un loader non bloquant s'affiche avec la mention "Configuration en cours", sans aucun "timeout client" agressif de l'UI.
*   **Scénario 3.2 : Transition Automatique Dashboard**
    *   **GIVEN** Le backend valide la création
    *   **WHEN** Le tenant switch s'opère (`TenantRuntime`)
    *   **THEN** La Single Page App affiche le dashboard du nouveau tenant sans que l'utilisateur ait besoin de rafraîchir la page (Cache Invalidation OK).

---

## 4. CHAOS / RESILIENCE TESTS (Mobile Africa / 3G)

**Objectif :** Détruire le flux pendant l'exécution.

*   **Scénario 4.1 : Disparition de la connexion réseau (Airplane Mode)**
    *   **GIVEN** L'orchestrateur commence la transaction (Supabase Inserted)
    *   **WHEN** Le mock du réseau simule une erreur "Network Error" (Timeout total) au niveau Firebase.
    *   **THEN** L'orchestrateur retente (Retry: 1, 2, 3), finit par échouer, déclenche le SAGA Rollback de Firebase, et enregistre l'état bloqué.
*   **Scénario 4.2 : Arrêt de l'application (Crash Batterie)**
    *   **GIVEN** L'utilisateur est en train de provisionner (statut `WORKSPACE_CREATED`)
    *   **WHEN** L'exécution du thread Node/JS s'arrête net (simulation de fermeture de l'onglet)
    *   **THEN** Rien n'est perdu à court terme.

---

## 5. RECOVERY / OFFLINE TESTS (RecoveryManager)

**Cible :** `RecoveryManager` + LocalStorage API

*   **Scénario 5.1 : Récupération après Crash**
    *   **GIVEN** L'état suspendu `WORKSPACE_CREATED` de tout à l'heure existe en `localStorage` sous la clé `NEXUS_BOOTSTRAP_PENDING`
    *   **WHEN** L'utilisateur relance le processus de création `startBootstrap`
    *   **THEN** L'orchestrateur détecte le contexte précédent (via `idempotencyKey`), le reprend, ne recrée pas l'entreprise et force la passage à l'étape `MEMBERSHIP_CREATED`.

---

## 6. SECURITY TESTS (Multi-Tenant & RLS)

**Objectif :** Garantir qu'aucune création ou assignation tenant ne transperce les murs RLS et rôles.

*   **Scénario 6.1 : Injection Tenant ID**
    *   **GIVEN** Un client hacker tente de rejouer la requête d'orchestration
    *   **WHEN** Il passe des paramètres falsifiés sur l'ID d'entreprise
    *   **THEN** L'Orchestrateur refuse d'aller à la source, car c'est le composant sécurisé (`SupabaseBootstrapRepo`) qui force la règle Backend-Side `auth.uid() = owner_id`, l'insertion de rôle Owner est faite localement sans payload externe.
*   **Scénario 6.2 : Ghost Tenant Isolation**
    *   **GIVEN** Un rollback échoue partiellement (très rare)
    *   **WHEN** L'utilisateur tente de lire l'entreprise via une API normale
    *   **THEN** L'API Supabase RLS bloque l'accès si le processus Backend `MEMBERSHIP_CREATED` n'a jamais été validé sur la table memberships (Protection croisée).
