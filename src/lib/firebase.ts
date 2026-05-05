import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
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
import { handleFirestoreError, OperationType } from './errorHandlers';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

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
        displayName: user.displayName || user.email?.split('@')[0],
        emailVerified: user.emailVerified
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
    console.error("Login error:", error);
    throw error;
  }
};

export async function signupWithEmail(email: string, pass: string) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (result.user) {
      await sendEmailVerification(result.user);
    }
    return { user: result.user };
  } catch (error: any) {
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
