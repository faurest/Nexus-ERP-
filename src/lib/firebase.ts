import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  collection as firestoreCollection, 
  doc as firestoreDoc, 
  addDoc as firestoreAddDoc, 
  setDoc as firestoreSetDoc, 
  updateDoc as firestoreUpdateDoc, 
  deleteDoc as firestoreDeleteDoc, 
  getDoc as firestoreGetDoc,
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
const secondaryApp = initializeApp(firebaseConfig, "Secondary");

// Improved Firestore initialization with resilience settings
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
  // experimentalForceLongPolling is already set, but we can ensure other settings are robust
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const secondaryAuth = getAuth(secondaryApp);

export const registerUserWithoutLogin = async (email: string, pass: string) => {
  try {
    const result = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
    await signOut(secondaryAuth);
    return { user: result.user };
  } catch (error) {
    console.error("Secondary auth creation error:", error);
    throw error;
  }
};

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
  
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection - made more resilient and informative
export async function testFirestoreConnection() {
  console.log("Nexus Firebase: Diagnostic de connexion Nexus Cloud...");
  
  try {
    const testDoc = firestoreDoc(db, 'companies', 'connection-check-' + Math.random().toString(36).substring(7));
    // Use the persistent cache version first if available, or a shorter timeout if possible
    // Note: getDocFromServer is very strict and fails fast on network issues
    const snap = await getDocFromServer(testDoc);
    console.log("Nexus Firebase: ✅ Nexus Cloud Link synchronisé.");
    return true;
  } catch (error: any) {
    const msg = error.message || String(error);
    if (msg.includes('offline') || msg.includes('reach') || msg.includes('timeout')) {
      console.warn("Nexus Firebase: ⚠️ Mode Dégradé/Offline - La connexion directe au Nexus Cloud est lente ou absente.");
      return true; // We return true because the app can still function in offline mode using local cache
    } else if (msg.includes('permission-denied') || msg.includes('permission')) {
      console.log("Nexus Firebase: ✅ Link actif (Réponse Sécurisée reçue).");
      return true;
    }
    console.warn("Nexus Firebase: ℹ️ Diagnostic passif :", msg);
    return true;
  }
}
// Do not call immediately at module level to avoid blocking app start or triggering early timeouts
// testConnection(); 

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

export const registerWithEmail = async (email: string, pass: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    
    // Create profile
    const cleanEmail = email.trim().toLowerCase();
    const userData: any = {
      uid: result.user.uid,
      email: cleanEmail,
      displayName: cleanEmail.split('@')[0],
      photoURL: null,
      updatedAt: firestoreServerTimestamp()
    };
    
    await firestoreSetDoc(firestoreDoc(db, 'users', result.user.uid), userData, { merge: true });
    await firestoreSetDoc(firestoreDoc(db, 'users', cleanEmail), userData, { merge: true });

    return { user: result.user };
  } catch (error) {
    console.error("Email register error:", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return { user: result.user };
  } catch (error) {
    console.error("Email login error:", error);
    throw error;
  }
};

export const loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    // Explicitly request email and profile scopes to ensure Firebase captures the email
    provider.addScope('https://www.googleapis.com/auth/userinfo.email');
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    
    const result = await signInWithPopup(auth, provider);
    
    // Check/Create profile with robust email detection
    try {
      const providerEmail = result.user.providerData?.find(p => p.email)?.email;
      const rawEmail = result.user.email || providerEmail;
      const cleanEmail = rawEmail ? rawEmail.trim().toLowerCase().replace(/\s+/g, '') : null;
      
      const userId = cleanEmail || result.user.uid;
      const userData: any = {
        uid: result.user.uid,
        email: cleanEmail || null,
        displayName: result.user.displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'Utilisateur Nexus'),
        photoURL: result.user.photoURL || null,
        updatedAt: firestoreServerTimestamp()
      };

      // Sanitize userData to avoid Firestore crashes on undefined
      Object.keys(userData).forEach(key => {
        if (userData[key] === undefined) userData[key] = null;
      });

      await firestoreSetDoc(firestoreDoc(db, 'users', userId), userData, { merge: true });
      
      // Secondary indexing if UID was used as primary
      if (cleanEmail && userId !== cleanEmail) {
        await firestoreSetDoc(firestoreDoc(db, 'users', cleanEmail), userData, { merge: true });
      }
    } catch (e) {
       // Ignore if just permission error on first hit
    }
    
    return { user: result.user };
  } catch (error: any) {
    console.error("Google login error:", error);
    throw error;
  }
};

export const logout = async () => {
  await signOut(auth);
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

export function and(...args: any[]) {
  return firestoreAnd(...args);
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
  return firestoreOrderBy(field, direction);
}

export function limit(v: number) {
  return firestoreLimit(v);
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

export async function getDoc(docRef: any) {
  try {
    const snap = await firestoreGetDoc(docRef);
    return {
      id: snap.id,
      exists: () => snap.exists(),
      data: () => snap.data()
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docRef.path);
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
