# NEXUS ERP - BOOTSTRAP UI STATE GATE
**Rôle:** Principal Frontend/Backend Architect
**Sujet:** Sécurisation de l'accès UI Post-Provisioning (Stripe-level reliability)

Le module `tenant-bootstrap/ui-gate` protège l'expérience utilisateur des affichages transitoires et des instabilités éventuelles pouvant survenir après la création d'une entreprise.

## 1. Principe Central : L'UI comme Conséquence du Verdict
Traditionnellement, la fin d'une requête API de création d'entreprise ou les WebSockets de synchronisation Firebase dirigent directement l'utilisateur vers son nouveau Dashboard (`COMPANY_CREATED`). 
Dans un SaaS critique évoluant en environnements instables (mobiles, réseaux instables), cela est un anti-pattern. 
- L'UI ne doit **JAMAIS** écouter de signaux temporels intermédiaires. 
- Le droit d'accéder au Dashboard ne s'obtient **QUE** par le `BootstrapVerdictEngine`.

## 2. Le BootstrapUIStateGate
C'est le composant frontière. Il ne connaît pas `Firebase` ni `Supabase`. Il prend l'`idempotencyKey` de l'exécution, interroge le `Moteur de Consistance`, et distribue l'un des trois états absolus :
- **LOCKED** : L'interface reste bloquée. Aucun appel à la navigation. L'utilisateur voit un écran de stabilisation, car la transaction est toujours incomplète (ex. Firebase tourne dans le vide).
- **READ_ONLY** : La transaction a été sauvée "aux forceps" (ex: crash puis *Offline Recovery*). L'ouverture est permise, mais sous restriction, car le système s'est stabilisé manuellement.
- **FULL_ACCESS** : La transaction est `VERIFIED_SUCCESS`. Accès total et immédieat au Dashboard validé.

## 3. Flux Dé-couplé et Isolation Strict
1. Le Frontend déclenche le bootstrap (orchestrateur backend-oriented).
2. L'Orchestrateur avance jusqu'à `TENANT_STABILIZING` et finit.
3. Le Moteur de Vérification produit son *Verdict*.
4. Le Frontend scrute le `BootstrapUIStateGate.waitForStabilization()` qui passe en boucle d'attente (max 15s, non bloquant).
5. Dès obtention d'un status `FULL` ou `READ_ONLY`, le switch logiciel (Router/Zustand) s'ouvre, sans transition prématurée ni flash de contenu corrompu.

L'isolation est ainsi respectée à 100%. L'UI s'aligne uniquement sur la *Vérité Formelle* (le Verdict final calculé par la couche d'observabilité) plutôt que sur des messages asynchrones transitoires.
