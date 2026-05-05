import { supabase } from './supabase';

export const db = {} as any;
export const auth = {} as any;

let currentUser: any = null;
const listeners: ((user: any) => void)[] = [];

export function onAuthStateChanged(auth: any, cb: (user: any) => void) {
  const userStr = localStorage.getItem('erpUser');
  if (userStr) {
    currentUser = JSON.parse(userStr);
  }
  
  // Check session with Supabase
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      currentUser = {
        uid: session.user.id,
        email: session.user.email,
        displayName: session.user.user_metadata?.displayName || session.user.email?.split('@')[0]
      };
      notifyAuth();
    }
  });

  cb(currentUser);
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

function notifyAuth() {
  if (currentUser) {
    localStorage.setItem('erpUser', JSON.stringify(currentUser));
  } else {
    localStorage.removeItem('erpUser');
  }
  listeners.forEach(cb => cb(currentUser));
}

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });

    if (!response.ok) {
      const errorData = await response.json();
      const err: any = new Error(errorData.message || 'Erreur d\'authentification');
      err.code = errorData.error ? 'auth/' + errorData.error : 'auth/invalid-credential';
      throw err;
    }

    const userData = await response.json();
    currentUser = {
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName || userData.email.split('@')[0]
    };

    notifyAuth();
    return { user: currentUser };
  } catch (error: any) {
    console.error("Login error:", error);
    throw error;
  }
};

export async function signupWithEmail(email: string, pass: string) {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });

    if (!response.ok) {
      const errorData = await response.json();
      const err: any = new Error(errorData.message || 'Erreur d\'inscription');
      err.code = errorData.error ? 'auth/' + errorData.error : 'auth/weak-password';
      throw err;
    }

    const userData = await response.json();
    currentUser = {
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName || userData.email.split('@')[0]
    };

    notifyAuth();
    return { user: currentUser };
  } catch (error: any) {
    console.error("Signup error:", error);
    throw error;
  }
}

export const logout = async () => {
  await supabase.auth.signOut();
  currentUser = null;
  notifyAuth();
};

export const createEmployeeAccount = async (email: string, pass: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
  });
  if (error) throw error;
  return { user: { email } };
};

export const secondaryAuth = {
  signOut: async () => {}
};

export const serverTimestamp = () => new Date().toISOString();
export const arrayUnion = (...args: any[]) => ({ _arrayUnion: args });

const dbListeners: { path: string, cb: any, queryParams?: any[] }[] = [];

export function collection(db: any, path: string) {
  return { type: 'collection', path };
}

export function doc(dbOrCol: any, pathOrCollection?: any, idPart?: string) {
  if (dbOrCol && dbOrCol.type === 'collection') {
    return { type: 'doc', path: dbOrCol.path + '/' + (idPart || '') };
  }
  if (typeof pathOrCollection === 'string') {
    if (idPart) return { type: 'doc', path: pathOrCollection + '/' + idPart };
    return { type: 'doc', path: pathOrCollection };
  }
  return { type: 'doc', path: pathOrCollection.path + '/' + (idPart || '') };
}

export function query(col: any, ...constraints: any[]) {
  return { ...col, constraints };
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export async function addDoc(col: any, data: any) {
  const response = await fetch(`/api/data/${col.path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, createdAt: Date.now() })
  });
  if (!response.ok) throw new Error(await response.text());
  const result = await response.json();
  notifyDb(col.path);
  return { id: result.id };
}

export function or(...args: any[]) {
  return { type: 'or', args };
}

export async function setDoc(docRef: any, data: any, options?: any) {
  const parts = docRef.path.split('/');
  const table = parts[0];
  const id = parts[1];

  const response = await fetch(`/api/data/${table}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, updatedAt: Date.now() })
  });
  if (!response.ok) throw new Error(await response.text());
  notifyDb(docRef.path);
}

export async function updateDoc(docRef: any, data: any) {
  const parts = docRef.path.split('/');
  const table = parts[0];
  const id = parts[1];

  const response = await fetch(`/api/data/${table}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(await response.text());
  notifyDb(docRef.path);
}

export async function deleteDoc(docRef: any) {
  const parts = docRef.path.split('/');
  const table = parts[0];
  const id = parts[1];

  const response = await fetch(`/api/data/${table}/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error(await response.text());
  notifyDb(docRef.path);
}

function notifyDb(path: string) {
  dbListeners.forEach(l => {
    if (path.startsWith(l.path)) {
      triggerDbListener(l);
    }
  });
}

async function triggerDbListener(l: any) {
  try {
    const parts = l.path.split('/');
    const table = parts[0];
    const id = parts[1];

    if (id) {
      const response = await fetch(`/api/data/${table}/${id}`);
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      
      l.cb({
        id,
        exists: () => !!data,
        data: () => data
      });
    } else {
      let path = `/api/data/${table}`;
      const params = new URLSearchParams();
      
      if (l.queryParams) {
        l.queryParams.forEach((qConstraint: any) => {
          if (qConstraint.type === 'where' && qConstraint.op === '==') {
            params.append(qConstraint.field, qConstraint.value);
          }
        });
      }

      // Add currentUser info for master filtering on server
      if (currentUser) {
        params.append('requestUserEmail', currentUser.email);
        params.append('requestUserId', currentUser.uid);
      }

      const queryString = params.toString();
      const finalPath = queryString ? `${path}?${queryString}` : path;

      const response = await fetch(finalPath);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${finalPath}):`, errorText);
        throw new Error(errorText);
      }
      const data = await response.json();
      
      l.cb({
        docs: (data || []).map((item: any) => ({
          id: item.id,
          data: () => item
        })),
        empty: !data || data.length === 0
      });
    }
  } catch (error) {
    if (l.errCb) l.errCb(error);
  }
}

export async function getDocs(query: any): Promise<any> {
    const table = query.path;
    let path = `/api/data/${table}`;
    const params = new URLSearchParams();
    
    if (query.constraints) {
        query.constraints.forEach((c: any) => {
            if (c.type === 'where' && c.op === '==') {
                params.append(c.field, c.value);
            }
        });
    }
    
    if (currentUser) {
      params.append('requestUserEmail', currentUser.email);
      params.append('requestUserId', currentUser.uid);
    }

    const queryString = params.toString();
    const finalPath = queryString ? `${path}?${queryString}` : path;

    const response = await fetch(finalPath);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`getDocs API Error (${finalPath}):`, errorText);
      throw new Error(errorText);
    }
    const data = await response.json();

    return {
        docs: (data || []).map((item: any) => ({
            id: item.id,
            data: () => item
        })),
        empty: !data || data.length === 0
    };
}

export function onSnapshot(queryOrDoc: any, cb: any, errCb?: any) {
  const l = { path: queryOrDoc.path, cb, errCb, queryParams: queryOrDoc.constraints || [] };
  dbListeners.push(l);
  triggerDbListener(l);
  
  const interval = setInterval(() => triggerDbListener(l), 5000);
  
  return () => {
    clearInterval(interval);
    const idx = dbListeners.indexOf(l);
    if (idx > -1) dbListeners.splice(idx, 1);
  };
}
