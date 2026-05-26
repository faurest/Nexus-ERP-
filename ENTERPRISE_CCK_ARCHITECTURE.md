# NEXUS ERP - CONTINUOUS CONSISTENCY KERNEL (CCK)

**Rôle:** Principal Distributed Systems Architect
**Sujet:** Boucle de contrôle & Réconciliation Anti-Drift

Même un système parfaitement booté et initialisé peut dévier (drift) au fil des heures : désynchronisation de la WebView, corruption de cache en arrière plan silencieuse, permissions modifiées côté serveur (Supabase) n'ayant pas atteint Firebase à temps.

## Approche Control Loop (Kubernetes-like)
Le `ContinuousConsistencyWatchdog` agit comme un Control Plane. Il ne se fie jamais aux événements, il fait du "Polling asynchrone furtif" (chaque 60s).

### Le Workflow de la Boucle
1. **Snapshots :** Le `ConsistencyDriftDetector` compare trois états.
   - `Supabase` = Le Backend Master Truth
   - `Firebase` = Le Mirror Temps-Réel
   - `Frontend` = Cache et State Modèles
2. **Classification (ConsistencyPolicyEngine) :**
   - *MINOR_DRIFT* -> Par exemple, Firebase est en retard sur Supabase. Action : Refresh Furtif.
   - *MEDIUM_DRIFT* -> Le frontend n'a plus les mêmes permissions que le backend. Action : Réhydratation Zustand et Reset Firebase Listeners.
   - *CRITICAL_DRIFT* -> Le TenantId affiché ne matche pas du tout ! Les données s'affichent mal. Action : FREEZE de l'UI et Reconstruction atomique via Recovery Runtime.
3. **Réconciliation (ConsistencyReconciler) :** Opère ces correctifs. L'UX reste totalement pure, sans redirection, de façon "self-healing" fluide.

L'architecture `Continuous Consistency Kernel` abolit définitivement la crainte du Silent Drift multi-tenant, et garantit un temps moyen de récupération sur erreur furtive en moins de 60 secondes.
