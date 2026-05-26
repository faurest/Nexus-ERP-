# NEXUS ERP - JET 7 INFO PROVISIONING (SAGA)
**Rôle:** Principal Backend Architect
**Sujet:** Script d'Onboarding Hybride SaaS pour JET 7 INFO

Afin de créer un locataire strict (tenant) isolé avec des membres aux droits disparates (OWNER vs EMPLOYEE) sans provoquer la moindre désynchronisation UI ou Firebase, nous abandonnons la création frontend pour adopter le pattern `BootstrapOrchestrator` complet.

## 1. La Transaction Atomique SAGA
Dans `/src/core/tenant-bootstrap/scripts/Jet7Provisioner.ts`, le processus est dicté par le `BootstrapOrchestrator`.
Si n'importe quelle étape casse (réseau, erreur 500, crash navigateur), l'idempotence prend le relais.
La création déroule automatiquement la séquence exigée :
(`COMPANY_CREATED` -> `WORKSPACE_CREATED` -> `ASSIGN_OWNER` -> `ASSIGN_EMPLOYEE` -> `PERMISSIONS_INITIALIZED` -> `SYNC_FIREBASE` -> `TENANT_STABILIZING`)

## 2. Découplage de la Logique de Rôle
Le OWNER `yaoubaboubakary43@gmail.com` (FULL_ACCESS) obtient son Id Supabase qui dirige l'idempotence (via le système de génération `users` idempotent fallback).
L'EMPLOYEE `dangafelicite@gmail.com` s'inscrit au sein de la transaction via une procédure `createMembershipByEmailIdempotent`.
Aucune permission orpheline ne peut exister.

## 3. Strict Verdict Verification
L'interface (le Router React) n'est jamais poussée par le script tant que :
`const state = await BootstrapUIStateGate.waitForStabilization(idempotencyKey);`
ne retourne pas formellement `UIState.FULL_ACCESS` ou `UIState.READ_ONLY`.
Le Verdict du `BootstrapVerdictEngine` est donc roi. Le CEG (Consistency Enforcement Gate) s'assure qu'aucun drift transactionnel ne vienne corrompre la session de M. Yaouba dès l'ouverture.
