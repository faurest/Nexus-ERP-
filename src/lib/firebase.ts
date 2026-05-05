import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection as firestoreCollection, 
  doc as firestoreDoc, 
  addDoc as firestoreAddDoc, 
  setDoc as firestoreSetDoc, 
  updateDoc as firestoreUpdateDoc, 
  deleteDoc as firestoreDeleteDoc, 
  getDocs as firestoreGetDocs, 
  onSnapshot as firestoreOnSnapshot,
  query as firestoreQuery,
  where as firestoreWhere,
  orderBy as firestoreOrderBy,
  limit as firestoreLimit,
  serverTimestamp as firestoreServerTimestamp,
  arrayUnion as firestoreArrayUnion,
  getDocFromServer,
  or as firestoreOr,
  and as firestoreAnd
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

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
      friendlyMessage = `Erreur : La collection ou le champ pour '${path}' semble manquant ou mal configuré dans Firebase.`;
    } else if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
      friendlyMessage = "Erreur : Vous n'avez pas les permissions nécessaires pour effectuer cette action.";
    }
    alert(friendlyMessage + "\n\nDétails : " + errorMessage);
  }

  throw new Error(JSON.stringify(errInfo));
}

// Test Connection
async function testConnection() {
  try {
    const testDoc = firestoreDoc(db, 'test', 'connection');
    await getDocFromServer(testDoc);
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();

// Auth implementation
export function onAuthStateChanged(auth: any, cb: (user: any) => void) {
  return firebaseOnAuthStateChanged(auth, (user) => {
    if (user) {
      cb({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0]
      });
    } else {
      cb(null);
    }
  });
}

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return { user: result.user };
  } catch (error: any) {
    if (error.code === 'auth/operation-not-allowed') {
      alert("ERREUR : La méthode de connexion par Email/Mot de passe n'est pas activée dans votre console Firebase.\n\nAllez dans Authentication > Sign-in method et activez 'Email/Password'.");
    }
    console.error("Login error:", error);
    throw error;
  }
};

export async function signupWithEmail(email: string, pass: string) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    return { user: result.user };
  } catch (error: any) {
    if (error.code === 'auth/operation-not-allowed') {
      alert("ERREUR : La méthode de connexion par Email/Mot de passe n'est pas activée dans votre console Firebase.\n\nAllez dans Authentication > Sign-in method et activez 'Email/Password'.");
    }
    console.error("Signup error:", error);
    throw error;
  }
}

export const logout = async () => {
  await signOut(auth);
};

export const createEmployeeAccount = async (email: string, pass: string) => {
  // In Firebase, we can't easily create another user from the client without signing out
  // Unless we use a secondary auth instance or Admin SDK (server-side)
  // For now, let's just use the main signup for demo if it's meant to be a registration flow
  // Or just return a standard signup call (which will sign in the new user).
  return signupWithEmail(email, pass);
};

export const secondaryAuth = {
  signOut: async () => {
    await signOut(auth);
  }
};

// Firestore helper patterns matching existing code
export const serverTimestamp = firestoreServerTimestamp;
export const arrayUnion = firestoreArrayUnion;

export function collection(db: any, path: string) {
  return firestoreCollection(db, path);
}

export function doc(dbOrCol: any, pathOrCollection?: any, idPart?: string) {
  if (idPart) {
    return firestoreDoc(dbOrCol, pathOrCollection, idPart);
  }
  return firestoreDoc(dbOrCol, pathOrCollection);
}

export function query(col: any, ...constraints: any[]) {
  return firestoreQuery(col, ...constraints);
}

export function where(field: string, op: any, value: any) {
  return firestoreWhere(field, op === '==' ? '==' : op, value);
}

export function or(...args: any[]) {
  return firestoreOr(...args);
}

export async function addDoc(col: any, data: any) {
  try {
    const result = await firestoreAddDoc(col, { ...data, createdAt: firestoreServerTimestamp() });
    return { id: result.id };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, col.path);
    throw error;
  }
}

export async function setDoc(docRef: any, data: any, options?: any) {
  try {
    await firestoreSetDoc(docRef, { ...data, updatedAt: firestoreServerTimestamp() }, options);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docRef.path);
    throw error;
  }
}

export async function updateDoc(docRef: any, data: any) {
  try {
    await firestoreUpdateDoc(docRef, { ...data, updatedAt: firestoreServerTimestamp() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docRef.path);
    throw error;
  }
}

export async function deleteDoc(docRef: any) {
  try {
    await firestoreDeleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docRef.path);
    throw error;
  }
}

export async function getDocs(query: any): Promise<any> {
    try {
      const result = await firestoreGetDocs(query);
      return {
          docs: result.docs.map((item: any) => ({
              id: item.id,
              data: () => item.data(),
              exists: () => item.exists()
          })),
          empty: result.empty
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, null);
      throw error;
    }
}

export function onSnapshot(queryOrDoc: any, cb: any, errCb?: any) {
  return firestoreOnSnapshot(queryOrDoc, (snapshot: any) => {
    if (snapshot.docs) {
      cb({
        docs: snapshot.docs.map((item: any) => ({
          id: item.id,
          data: () => item.data(),
          exists: () => item.exists()
        })),
        empty: snapshot.empty
      });
    } else {
      cb({
        id: snapshot.id,
        exists: () => snapshot.exists(),
        data: () => snapshot.data()
      });
    }
  }, (error) => {
    if (errCb) {
      errCb(error);
    }
    handleFirestoreError(error, OperationType.GET, queryOrDoc.path);
  });
}
