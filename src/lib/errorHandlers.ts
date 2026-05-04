import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  let errorMessage = '';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    try {
      errorMessage = JSON.stringify(error);
    } catch {
      errorMessage = String(error);
    }
  } else {
    errorMessage = String(error);
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Alert the user with a friendly message
  if (typeof window !== 'undefined') {
    let friendlyMessage = "Une erreur est survenue lors de l'opération.";
    if (errorMessage.includes('not found') || errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
      friendlyMessage = `Erreur : La table ou la colonne pour '${path}' est manquante dans votre base de données Supabase. Veuillez exécuter le script SQL dans SUPABASE_SETUP.md.`;
    } else if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
      friendlyMessage = "Erreur : Vous n'avez pas les permissions nécessaires pour effectuer cette action.";
    }
    alert(friendlyMessage + "\n\nDétails : " + errorMessage);
  }

  throw new Error(JSON.stringify(errInfo));
}
