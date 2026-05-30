export interface DataAccessContract {
  isGatewayAvailable: () => boolean;
  // Les modules doivent utiliser cette Gateway pour accéder aux données, 
  // leur interdisant théoriquement l'accès direct aux bases (Firestore, Supabase)
  query: <T>(entity: string, params?: Record<string, any>) => Promise<T[]>;
  mutate: <T>(entity: string, action: 'CREATE' | 'UPDATE' | 'DELETE', payload: any) => Promise<T>;
}
