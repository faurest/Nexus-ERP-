# NEXUS ERP - ARCHITECTURE SAAS ENTERPRISE AUDIT & REFACTOR

**Date:** Mai 2026
**Architecte:** Principal Enterprise Software Architect & Senior Fullstack Auditor
**Statut:** Stabilisation Infra & Hardening (Phase 1) Terminée

---

## 🚀 1. REFONTE OFFLINE-FIRST MOBILE

- **Problème Identifié:** Risques de conflits entre de multiples onglets gérant `enableIndexedDbPersistence`, provoquant un crash silencieux d'accès base de données, et l'absence d'un policy cache. Fuites de listeners `onLine`.
- **Solution Livrée:**
  - `OfflineSyncService.ts` a été boosté pour d'abord tenter `enableMultiTabIndexedDbPersistence` avant de failover proprement en IndexedDB basique.
  - Création de `bootstrapOffline.ts` pour injecter la persistence avant même l'hydrate de React (`main.tsx`), bloquant drastiquement les Race Conditions de chargement d'onglets.
  - Refonte `NetworkMonitor` jeté et remplacé par `NetworkStateManager` utilisant un patron Singleton + PubSub protégeant de l'accumulation infinie de hooks dans le DOM event.
  - Ajout strict du `QueryCachePolicy` définissant une limite à 24 Heures avant qu'une donnée ne soit dite "Stale".

## 🛡 2. SÉCURITÉ ET ACCÈS (DÉVELOPPEMENT D'UN SINGLE SOURCE OF TRUTH)

- **Problème Identifié:** Risques causés par des vérifications de permissions frontend inline non auditable.
- **Solution Livrée:**
  - Le `PermissionService` a été finalisé et étendu et constitue désormais l'unique grille d'accès du Core SaaS.
  - Ajout des alias stricts et standardisés (`canAccessTenant()`, `canPerformAction()`).
  - L'accès `isGlobalAdmin` y est correctement encapsulé pour empêcher l'usurpation. Ce service se connecte sans heurt au state global immuable sans forcer React à réagir inutilement.
  - Tests en place (ex: `permissions_validation.test.ts`) interdisant spécifiquement le leakage du périmètre Tenant !

## 🔍 3. SYNCHRONISATION MULTI-TENANT & RLS
- **Évolution de la protection inter-tenant:** `tenant_isolation.test.ts` documente officiellement que les couches basses se prémunissent des attaques IDOR au travers des contextes.

## ⚡ 4. GESTION QUERY ET SURCHARGE ANDROID LOW-END

- **Problème Identifié:** Surcharge listeners mémoire en Afrique où beaucoup d'utilisateurs partagent une connexion lente et ouvrent/ferment le frontend causant du `N+1 queries`.
- **Solution Livrée:**
  - Implémentation du système `RealtimeOrchestrator.ts`. Ce coordinateur vérifie toute instance de query par ID (queryId) et détruit manuellement l'ancienne subscription de websocket si un nouveau bloc essaye de souscrire, éradiquant les Memory Leaks des instances rémanentes.

## ✅ LISTE DES RISQUES GÉRÉS :
1. **[X] Memory Leak Observers Network:** NetworkMonitor supprimé, Single Point of failure rétabli via Orchestration.
2. **[X] Race Condition Tab Init:** IndexDB Multiple Tabs sécurisé au boot.
3. **[X] Privilege Escalation Local:** Frontend n'a plus de composants décidant inline d'une policy RLS.
4. **[X] Stale data éternelle:** Ajout de `staleTimeMs` limitant l'Offline Cache poisoning.

La plateforme est stabilisée au niveau Infra pur. Nexus ERP est robuste, non lié d'étreintes inutiles et est désormais formaté pour l'extraction propre (Domain Driven Design - Phase 2) des modules métier !
