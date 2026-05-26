# NEXUS ERP - BOOTSTRAP UI ACCESS GATE
**Rôle:** Principal Frontend + Backend Architecture Engineer
**Sujet:** UI Gate et Stabilisation de l'Interface Post-Provisioning

Pour s'assurer du niveau de fiabilité AWS/Stripe-grade pour l'onboarding SaaS, l’interface entreprise (Dashboard) ne doit **jamais** pouvoir être interceptée au vol (render prématuré) avant que la consistance totale ne soit vérifiée par nos moteurs distribués.

## 1. La Problématique
Une State Machine pure (`COMPANY_CREATED` -> `SYNC_FIREBASE` -> `TENANT_SWITCHED`) opère parfois en différé avec les renders React de l'interface qui auraient pu réagir de manière autonome au `TENANT_SWITCHED`, menant sur un dashboard dont les droits locaux (Zustand/Firebase listeners) n'étaient pas encore stables.

## 2. Le Rempart : TENANT_STABILIZING et UI Access Gate
L’introduction de la vérification croisée passe par deux éléments concrets :
- L'état **TENANT_STABILIZING** : Un pont suspendu où la transaction backend est formellement terminée, mais l'accréditation du routage attend le feu vert du Consistency Engine (Verdict = `VERIFIED_SUCCESS` ou `RECOVERED_SUCCESS`). L'Orchestrateur passe enfin à `COMPLETED`.
- Le **BootstrapUIAccessController** :
   Ce composant bloque ou libère le Frontend de manière atomique.
   Il agit en tant que vérificateur.

## 3. Matrice de Décision (UIAccessState)

- `VERIFIED_SUCCESS` -> **ALLOW_FULL_ACCESS**
  *Le locataire est clean, le cache est vidé, Firebase répond, le Dashboard s'ouvre normalement.*
  
- `RECOVERED_SUCCESS` -> **ALLOW_READ_ONLY_ACCESS**
  *La transaction a crashé et est revenue d'outre-tombe. Le boot est complet, mais par sécurité transactionnelle, on limite les premières actions.*
  
- `INCONSISTENT` / `PARTIAL_STATE` / Timeout -> **BLOCK_ACCESS**
  *Le dashboard est verouillé net. L'UI maintient l'écran de progression "Stabilization in progress / Recovery mode".*

## 4. Implémentation
Le composant est non bloquant pour le thread React (polling asynchrone / await non-agressif). 
Il s'intègre en parfaite harmonie avec le système Offline First (si l'état reste bloqué par une désynchronisation locale, le Retry/Recovery relance le checkpoint).
L'orchestrateur est inchangé, on a ajouté cette étape tampon sans refactorer l'existant.
