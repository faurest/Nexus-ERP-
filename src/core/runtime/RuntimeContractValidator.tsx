import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { AuthContract, TenantContract, DataAccessContract } from '../contracts';

export interface RuntimeValidatorProps {
  auth: AuthContract | null;
  tenant: TenantContract | null;
  data: DataAccessContract | null;
  moduleName: string;
  children: React.ReactNode;
}

/**
 * Composant de sécurité (Runtime Contract Enforcement) enveloppant chaque module.
 * Assure que le module ne peut pas s'exécuter si l'environnement d'isolation 
 * ou la passerelle de données ne répondent pas aux contrats.
 */
export const RuntimeContractValidator: React.FC<RuntimeValidatorProps> = ({ 
  auth, 
  tenant, 
  data, 
  moduleName,
  children 
}) => {
  const errors: string[] = [];

  // Validation Auth
  if (!auth) {
    errors.push('AuthContract manquant : Le module nécessite une injection de dépendance auth.');
  } else if (!auth.isAuthenticated() || !auth.getIdentity()) {
    errors.push('AuthContractViolation : Identité utilisateur absente ou non vérifiée.');
  }

  // Validation Tenant
  if (!tenant) {
    errors.push('TenantContract manquant : Le module nécessite une injection de dépendance tenant.');
  } else if (!tenant.hasActiveTenant() || !tenant.getActiveTenant()?.tenantId) {
    errors.push('TenantContractViolation : Isolation multi-tenant défaillante (aucun identifiant tenant actif).');
  }

  // Validation Data Access
  if (!data) {
    errors.push('DataAccessContract manquant : Le module nécessite une Gateway data.');
  } else if (!data.isGatewayAvailable()) {
    errors.push('DataAccessContractViolation : Data Gateway non disponible. Interdiction d\'accès direct.');
  }

  if (errors.length > 0) {
    return (
      <div className="p-6 bg-red-950/30 border border-red-500/30 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col md:flex-row gap-6 max-w-4xl mx-auto my-8">
        <div className="shrink-0 p-4 bg-red-900/20 rounded-full h-fit">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-red-400 mb-2 flex items-center gap-2">
            Module Bloqué <span className="text-neutral-500 text-sm font-mono border border-neutral-700 px-2 py-0.5 rounded bg-neutral-900">{moduleName}</span>
          </h2>
          <p className="text-neutral-300 text-sm mb-4">
            L'exécution de ce module a été interceptée et refusée par la Couche Contractuelle d'Exécution (Runtime Contract Enforcement Layer). 
            La sécurité et l'isolation des données ne sont pas garanties.
          </p>
          
          <div className="bg-neutral-950 border border-red-900/50 rounded-lg p-4">
             <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3">Infractions Détectées</h3>
             <ul className="space-y-2">
               {errors.map((error, idx) => (
                 <li key={idx} className="flex items-start gap-2 text-sm text-red-200">
                    <span className="text-red-500 font-bold mt-0.5">•</span>
                    <span className="font-mono text-xs">{error}</span>
                 </li>
               ))}
             </ul>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
