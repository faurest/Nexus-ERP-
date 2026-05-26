# NEXUS ERP - ENTERPRISE ARCHITECTURE MASTER PLAN

**Date:** Mai 2026
**Auteur:** Principal Enterprise Software Architect
**Statut:** Approuvé & En cours d'implémentation
**Cible:** SaaS B2B Multi-Tenant Offline-First (Afrique)

Ce document définit la stratégie officielle, modulaire, scalable et non-destructive pour amener le code de Nexus ERP vers une architecture Enterprise Grade (DDD + Clean Architecture + Modular Monolith), sans casser la stabilité fonctionnelle actuelle.

---

## 1. ARCHITECTURE CIBLE COMPLÈTE (MODULAR MONOLITH)

Nexus ERP est un "Monolithe Modulaire" basé sur les principes du Domain Driven Design (DDD) et de la Clean Architecture. 

### Séparation stricte (Frontend / Backend / Infrastructure)
- **UI Layer (React/Zustand):** N'a **aucune idée** de Firebase ou Supabase. Elle consomme des hooks et des Services purs.
- **Service Layer (Métier):** Contient les règles métier (ex: `processCheckout`, `assignRole`).
- **Repository Layer:** Interfaces d'accès aux données, ignorant comment elles sont stockées.
- **Infrastructure Layer (Firebase/Supabase):** Implémentations réelles des accès distants, des RLS et de l'IndexedDB.
- **API Layer:** RPC et Edge Functions.

### 2. PLAN DE MIGRATION PROGRESSIVE (NON-DESTRUCTIF)

**Principe:** Strangler Fig Pattern. On migre domaine par domaine.
1. ✅ **Phase 0:** Stabiliser les fondations actuelles (Permissions, RLS, Recovery Engine).
2. 🔄 **Phase 1 (En cours):** Extraire la logique Supabase/Firebase des composants UI vers les `repositories` et `api`.
3. ⏳ **Phase 2:** Création complète de la hiérarchie `/src/modules/` et déploiement du `PermissionService` unique.
4. ⏳ **Phase 3:** Migration module par module (ex: isoler `ClientModule` dans `/src/modules/crm/`).
5. ⏳ **Phase 4:** Remplacement du routage interne/visuel pour s'appuyer exclusivement sur le chargement lazy par domaine métier.

### 3. STRUCTURE DE DOSSIERS IDÉALE

La refonte se fera vers cette structure :

```text
src/
├── core/              # Noyau dur (Auth, Tenant, Offline Sync, Router, Theme) -> AUCUN METIER ICI
├── modules/           # Domaines Métier cloisonnés (Sales, HR, Inventory, Marketplace...)
│   └── sales/
│       ├── api/       # Appels distants spécifiques (RPC/Functions)
│       ├── components/# Composants UI privés au module
│       ├── store/     # State local du module (si nécessaire)
│       ├── services/  # Business logic (règles de domaine)
│       ├── repositories/ # Accès aux données du domaine
│       └── pages/     # Vues principales aggregées
├── shared/            # Code réutilisé inter-modules (Types globaux, Utils)
├── ui/                # Design System (Boutons, Inputs, Cards - purs, stateless)
├── infrastructure/    # Adaptateurs technologiques (Firebase, Supabase config, indexedDB wrappers)
├── permissions/       # Centralisation de PermissionService
├── monitoring/        # Audit, logs, analytiques (Sentry, Custom Firebase logs)
├── offline/           # Gestion cache, retry queue, network monitoring
└── tests/             # Tests d'intégration, e2e, QA
```

### 4. STANDARDS DE DÉVELOPPEMENT
1. **Zéro injection DB dans l'UI:** Toute requête réseau dans un composant (ex: `addDoc`, `getDoc`) est une dette technique. Utiliser les Repositories.
2. **Couplage Faible:** Un module ne peut pas dépendre d'un autre module directement. S'ils doivent communiquer, utiliser le store global, un événement (Event Bus), ou le Core API.
3. **Immutabilité:** Les states métier sont immuables. 
4. **Single Responsibility:** 1 Fichier = 1 Tâche pure.

### 5. STANDARDS SÉCURITÉ
1. **Server Authoritative:** Le Frontend ne décide jamais d'une autorisation critique (paiement, affiliation, suppression). Le Backend valide.
2. **RLS First:** Tout accès direct à Supabase doit passer par des vues validées par Policy RLS (`tenant_id == auth.uid()`).
3. **No Local Privilege Escalation:** Les rôles sont validés depuis la base, signés. Toute modification locale doit sauter à la reconnexion au Recovery Engine (Anti-Tampering).

### 6. STANDARDS PERFORMANCE
1. **Lazy Loading Agressif:** Les modules ne sont chargés en RAM que si l'utilisateur clique dessus (`React.lazy()` + Suspense). 
2. **Pagination Virtuelle:** Au lieu de charger N instances (Global Admin), charger 20 instances par lots (`cursor`).
3. **Memoization stricte:** Pas de re-renders inutiles (bloqué via Zustand selectors).

### 7. STANDARDS MOBILE AFRIQUE
1. **RAM Footprint:** Android WebView en Afrique est parfois contraint à <2Go RAM. On ne garde en cache que les 500 dernières entités de chaque module métier.
2. **Bandwidth:** Interrogation réseau par diffing/Optimistic Updates. Réduction maximale des payloads sortants.
3. **Timeout Recovery:** Les signaux 3G instables peuvent dropper les requêtes HTTP. Systématisation de la file d'attente (Retry Queue).

### 8. STANDARDS UI/UX (ENTERPRISE)
1. **Simplicité & Espace:** Design inspiré de Linear/Stripe. Utilisation de Tailwind avec grand respect des marges et du "white-space".
2. **Zéro distractions:** Pas de widgets lourds inutiles. On favorise la donnée (Data-Grid rapide, typographie claire).
3. **Feedback instantané:** Chaque action offre un état Loading, Success ou Error géré gracieusement sans bloquer l'écran principal.

### 9. STANDARDS OFFLINE-FIRST
1. **IndexedDB:** Firestore `enableIndexedDbPersistence()` activé nativement.
2. **Stale Data:** Un indicateur subtil de déconnexion affiche "Modifications locales en attente" en bas de l'écran. 
3. **Auto-Sync:** Lors du retour `online`, les writes locaux sont poussés au cloud sans intervention de l'utilisateur.

---

### 10. ROADMAP (MODULE PAR MODULE)

**Étape A : Isolation du Core**
- Refactor du routing vers `src/core/router/`.
- Déplacement Auth/Zustand vers `src/core/store/`.
- Finalisation du `PermissionService` (Dossier `src/permissions/`).

**Étape B : Migration des Modules Métiers (Ordre de priorité)**
1. `modules/marketplace/` : C'est le flux Cash-Machine. Isolement repo `marketplaceApi`.
2. `modules/crm/` (ClientModule actuel).
3. `modules/hr/` (PersonnelModule actuel).
4. `modules/inventory/` (ResourceModule).
5. `modules/accounting/` & `modules/sales/`.

### 11. SYSTÈME DE VALIDATION QA

La QA se fera sur 5 piliers :
- **QA Multi-Tenant:** `test_tenant_isolation` -> L'Entreprise A ne peut *jamais* charger la payload de l'Entreprise B.
- **QA Offline:** Couper le réseau (devtools), modifier une ressource, remettre le réseau. Vérifier que la mutation s'opère sur le Backend.
- **QA Sécurité:** Forger une invitation Enterprise frauduleuse et s'assurer que le backend RLS la rejette.
- **QA Mémoire:** Un Global Admin avec 120 entreprises allouées doit ouvrir Nexus ERP sans dépasser 150MB de RAM allouée à la WebView locale (vérifiable via Chrome Dev Tools).
- **QA UX:** Aucun temps de bloque blanc > 200ms autorisé. Utilisation systématique de skeleton loaders.

### 12. PLAN DE SCALING SAAS

Pour onboarder des milliers de clients :
1. **Base de données:** Partitionner les instances en fonction des `company_id` (Sharding de sécurité).
2. **Edge Caching:** La Marketplace et le catalogue public doivent passer via le CDN edge.
3. **Micro-Services futurs:** L'ERP restera un "Monolithe Modulaire" en Web. Mais sur le Cloud, les fonctions lourdes (ex: facturation masse en fin de mois SQL) seront exportées dans des Cloud Functions (Firebase Gen2 / Supabase Edge) orchestrées de façon événementielle (Event-Driven).

---

> Ce manifeste architectural fait désormais foi. Toutes les pull-requests futures (via prompts) ou remaniements devront se conformer à ces décisions pour garantir une application vendable, sécurisée, modulaire et adaptée à la cible "Enterprise Scale".
