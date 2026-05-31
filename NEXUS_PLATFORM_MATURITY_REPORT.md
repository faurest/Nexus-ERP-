# RAPPORT D'AUDIT DE MATURITÉ : NEXUS ERP
**Date** : 31 Mai 2026
**Objectif** : Évaluation objective de l'existant, sans modification, pour établir la photographie exacte de la plateforme.

---

## 1. ÉVALUATION PAR DOMAINE

### 1.1 Architecture & Modularisation
- **Niveau actuel** : 65%
- **État** : PARTIEL (Architecture hybride conflictuelle)
- **Fichiers concernés** : `src/App.tsx`, `server.ts`, `src/lib/firebase.ts`, `src/modules/*`
- **Dépendances** : Firebase SDK, Express, better-sqlite3
- **Risques** : Schizophrénie architecturale. Le code tente de faire cohabiter un backend Node.js/SQLite (`server.ts`) et l'accès direct frontend via Firebase (`src/lib/firebase.ts`).
- **Dette technique** : Élevée. La logique métier est répartie entre les règles Firestore et les composants UI (`AdminModule.tsx`, `DashboardModule.tsx`), avec des tentatives de synchronisation backend-frontend non normalisées.

### 1.2 Base de données
- **Niveau actuel** : 70%
- **État** : FONCTIONNEL (mais fragmenté)
- **Fichiers concernés** : `server.ts`, `src/lib/firebase.ts`, `package.json`
- **Dépendances identifiées** : Firestore (Principal), SQLite (Legacy/Parallèle), Supabase (Environnement prévu dans `.env.example`).
- **Risques** : Données potentiellement désynchronisées. L'outil de migration (`AdminModule.tsx`) copie aveuglément les données SQLite vers Firebase sans gestion robuste des conflits.
- **Dette** : Tables SQLite mortes ou redondantes vis-à-vis des collections Firestore (`companies`, `users`, `personnel`, etc.).

### 1.3 Authentification
- **Niveau actuel** : 60%
- **État** : PARTIEL
- **Fichiers concernés** : `src/core/auth/AuthService.ts`, `src/modules/auth/components/LoginScreen.tsx`, `server.ts`
- **Risques détectés** : Risque de "ghost sessions". La connexion Email/Mot de passe tape sur `/api/auth/login` (générant un JWT local), tandis que le SSO Google utilise Firebase. L'application écoute principalement `onAuthStateChanged` de Firebase pour la session active.

### 1.4 Multi-tenant (Isolation des entreprises)
- **Niveau actuel** : 75%
- **État** : FONCTIONNEL
- **Fichiers concernés** : `src/lib/CompanyContext.tsx`, `firestore.rules`, `src/App.tsx`
- **Source de vérité** : `CompanyContext` (Frontend) & Collection Firestore `companies`.
- **Risques** : L'isolation repose globalement sur le filtrage côté client (`where('companyId', '==', currentCompany.id)`) et nécessite une vigilance constante. Les règles Firestore protègent partiellement ces accès (vérification `isMemberOfCompany`), mais le backend SQLite ne possède aucune de ces sécurités par défaut.

### 1.5 Sécurité
- **Niveau actuel** : 30%
- **État** : CRITICAL
- **Fichiers concernés** : `server.ts`, `firestore.rules`
- **Risques critiques** : 
  - **Faille API (CRITICAL)** : Les endpoints `/api/data/:collection` sur le serveur Express permettent des requêtes quasi-directes en base SQLite sans validation stricte d'authentification ou de permissions par tenant.
  - **Hardcoding (HIGH)** : Des emails administrateurs (`hackeurfaurest@...`, `dangafelicite@...`) sont codés en dur dans les règles Firestore (`isAdmin()`) et dans les composants (`App.tsx`, `AdminModule.tsx`), constituant une backdoor permanente.

### 1.6 Frontend (UI/UX)
- **Niveau actuel** : 85%
- **État** : STABLE
- **Fichiers concernés** : `src/components/*`, `src/modules/*`
- **Dépendances** : React 19, Tailwind CSS, Lucide, Recharts, Framer Motion
- **Risques** : Composants massifs (`AdminModule.tsx` fait près de 2000 lignes, `DashboardModule.tsx` plus de 1000 lignes) rendant la maintenabilité très complexe.

---

## 2. SCÉNARIOS MÉTIER À VÉRIFIER

| Scénario Métier | État d'implémentation | Observations |
| :--- | :---: | :--- |
| 1. Création entreprise | **COMPLET** | Via l'interface, stocké dans Firestore. |
| 2. Création compte utilisateur | **COMPLET** | Géré via LoginScreen (SSO Google et Local). |
| 3. Connexion utilisateur | **COMPLET** | Opérationnelle malgré le conflit Local/Firebase. |
| 4. Invitation employé | **PARTIEL** | Logique de matching par Email (création aveugle de fiche dans "personnel"). |
| 5. Accès employé | **COMPLET** | Rôles appliqués dans l'UI. |
| 6. Gestion des rôles | **PARTIEL** | Les rôles sont validés côté UI mais peu sécurisés côté DB. |
| 7. Changement d'entreprise | **COMPLET** | Géré via `CompanyContext` et LocalStorage. |
| 8. Tableau de bord | **COMPLET** | Data fetching et graphiques Recharts fonctionnels. |
| 9. Gestion clients | **COMPLET** | CRUD complet (`ClientModule`). |
| 10. Gestion employés | **COMPLET** | CRUD via `PersonnelModule`. |
| 11. Comptabilité | **PARTIEL** | Module Accounting présent mais limité en règles de gestion. |
| 12. Stock | **COMPLET** | `ResourceModule` gère l'inventaire en temps réel. |
| 13. E-commerce | **COMPLET** | Système de Marketplace et de prise de commande intégré. |
| 14. Paramètres | **PARTIEL** | |
| 15. Administration | **COMPLET** | Module dédié très lourd, avec fonctions de clonage/normalisation. |

---

## 3. SCORING GLOBAL (Sur 100)

*   **Architecture** : **40/100** (Désynchronisation entre Express et Firebase)
*   **Sécurité** : **30/100** (Endpoints Node ouverts, Backdoors hardcodés)
*   **UX / UI** : **85/100** (Design soigné, animations, interface très riche)
*   **Backend** : **45/100** (SQLite expérimental/incomplet par rapport à Firestore)
*   **Frontend** : **80/100** (Fonctionnel mais dette technique forte sur les fichiers monolithiques)
*   **Multi-tenant** : **75/100** (Bien géré côté UI, isolation Firestore basique)
*   **Maintenabilité** : **35/100** (Fichiers géants, logique métier éparpillée)
*   **Scalabilité** : **50/100** (Dépend de Firestore, mais limité par le code frontend massif)

---

## 4. SYNTHÈSE & NIVEAU DE PRÉPARATION

1. **État réel du système** : Une plateforme extrêmement riche fonctionnellement côté UI, construite sur un modèle de prototype rapide, qui souffre d'une dette architecturale majeure (cohabitation SQLite/Express non sécurisé et Firebase Firestore). L'application s'appuie principalement sur Firestore pour son exécution temps réel.
2. **Priorités de correction (CRITIQUES)** : 
    - Supprimer la logique d'authentification hybride et unifier autour d'un seul Identity Provider.
    - Supprimer les vérifications d'administrateurs codées en dur (emails) pour utiliser un système de rôles dynamiques ou Custom Claims.
    - Sécuriser ou désactiver les routes `/api/data` du serveur Express (faille béante de requêtage non filtré).
    - Refactoriser les "Mega-Modules" (AdminModule, DashboardModule) en sous-composants.
3. **Pourcentage global d'avancement** : **~65%** (Les fondations UI/Fonctionnelles sont là, les fondations strictes backend/sécurité manquent).
4. **Estimation du niveau de préparation** : **Bêta avancée / MVP complet**. 
*(Ne peut pas être classé "Production Ready" à cause des impasses sécuritaires et de la dette technique au niveau de l'architecture de la base de données).*
