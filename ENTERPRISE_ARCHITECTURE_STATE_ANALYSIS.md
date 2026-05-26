# NEXUS ERP - ANALYSE STRATÉGIQUE & SÉCURITÉ ENTERPRISE

**Rôle :** Principal Enterprise Software Architect / Senior SaaS Security Engineer
**Focus :** Stabilité Runtime, Sécurité Multi-Tenant, Offline-First Afrique, UX Mobile

---

## 1. DÉTECTION DES FAILLES STRUCTURELLES & UX

### 1.1 Architecture & UX
- **Failles Structurelles :** Auparavant, la logique de vérification des rôles et l'accès réseau étaient disséminés dans les composants UI, provoquant des couplages forts et rendant impossible le "lazy loading". L'UI (React) portait la responsabilité de la sécurité là où elle ne devait faire que "refléter" l'état défini par le Backend (Supabase/Firebase).
- **Problèmes UX Mobile :** De nombreux "re-renders" étaient causés par des Zustand selectors mal optimisés ou des écoutes globales (ex: `onLine`). Sur un Android "low-end", cela surchauffe le CPU et consomme la batterie.
- **Réponse :** Centralisation stricte dans `src/core/runtime/` (Single Point of Truth) pour libérer les composants UI de toute logique d'infrastructure. L'orchestration runtime empêche la fuite mémoire.

### 1.2 Sécurité Multi-Tenant & RBAC
- **Risques :** L'escalade de privilèges locaux (bypass UI) en modifiant l'état Zustand `isGlobalAdmin: true`. Les leaks inter-tenant ("cross-tenant leaks") peuvent se produire via la persistance Firestore si l'on change d'entreprise (tenant) sans un hard-reset/scoping du cache hors ligne.
- **Réponse :** La `SecurityRuntime` ainsi que `TenantSecurityManager` vont gérer le scoping strict des identifiants et vider formellement la persistance asynchrone lors du "tenant switch". Déploiement de `RLSValidator` pour un audit croisé avec Supabase.

### 1.3 Gestion de l'Offline et des Événements
- **Problèmes Offline & Mobile :** Les micro-coupures (réseau 3G instable) provoquaient des mutations perdues ou bloquées et le polling agressif ruinait la bande passante.
- **Réponse :** Implémentation du système "Stale Cache" intelligent (>24h). Création de la file d'attente intelligente (Sync Queue) dirigée par la `SyncRuntime`.

---

## 2. DÉPLOIEMENT DE LA NOUVELLE VISION

Pour adresser ces points, nous avons initié la création de la couche `src/core/runtime/` et `src/core/security/`. 

Ces fondations respecteront sans faille :
1. **L'Approche "Backend First" :** Le frontend ne devinera **jamais** un accès, il ne fera que l'orchestrer depuis une source de vérité sûre.
2. **"Lazy" et Limité :** Réduction de la pression RAM via des instances "Singletons" (ex: `RuntimeOrchestrator`).
3. **Maintien de la Compatibilité :** Ces composants agissent pour le moment en "parallèle" pour que la migration suive le principe d'étranglement (*Strangler Fig*), protégeant ainsi le flux de production.

*L'implémentation du bootstrap complet pour la sécurité et le runtime est en cours.*
