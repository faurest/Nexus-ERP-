export const db = {} as any;
export const auth = {} as any;

let currentUser: any = null;
const listeners: ((user: any) => void)[] = [];

export function onAuthStateChanged(auth: any, cb: (user: any) => void) {
  const userStr = localStorage.getItem('erpUser');
  if (userStr) {
    currentUser = JSON.parse(userStr);
  }
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
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass })
  });

  if (!res.ok) {
    const err = await res.json();
    const error: any = new Error(err.error);
    error.code = 'auth/' + err.error;
    throw error;
  }

  currentUser = await res.json();
  notifyAuth();
  return { user: currentUser };
};

export async function signupWithEmail(email: string, pass: string) {
  return loginWithEmail(email, pass);
}

export const logout = async () => {
  currentUser = null;
  notifyAuth();
};

export const createEmployeeAccount = async (email: string, pass: string) => {
  // In this SQLite version, we don't strictly need a separate account creation
  // but we keep the signature for compatibility.
  return { user: { uid: 'emp_' + Math.random().toString(36).substring(2, 10), email } };
};

export const secondaryAuth = {
  signOut: async () => {}
};

export const serverTimestamp = () => Date.now();
export const arrayUnion = (...args: any[]) => ({ _arrayUnion: args });

const dbListeners: { path: string, cb: any, queryParams?: any[] }[] = [];

async function fetchData(path: string, queryParams?: any[]) {
    const parts = path.split('/');
    const coll = parts[0];
    const id = parts[1];
    
    let url = `/api/data/${coll}`;
    if (id) url += `/${id}`;
    
    // Add query filters if any
    const searchParams = new URLSearchParams();
    if (queryParams) {
        queryParams.forEach(q => {
            if (q.type === 'where' && q.op === '==') {
                searchParams.append(q.field, q.value);
            }
        });
    }
    
    if (searchParams.toString()) url += `?${searchParams.toString()}`;

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
    }
    return res.json();
}

async function triggerListener(l: any) {
  const pathParts = l.path.split('/');
  if (pathParts.length % 2 === 0) { // Doc
      const data = await fetchData(l.path);
      l.cb({
          id: pathParts[pathParts.length-1],
          exists: () => !!data,
          data: () => data
      });
  } else { // Collection
      const items = await fetchData(l.path, l.queryParams);
      l.cb({
        docs: items.map((data: any) => ({
            id: data.id,
            data: () => data
        })),
        empty: items.length === 0
      });
  }
}

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
  const res = await fetch(`/api/data/${col.path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
     const errorText = await res.text();
     throw new Error(errorText || `Server error: ${res.status}`);
  }
  const result = await res.json();
  notifyDb(col.path);
  return result;
}

export function or(...args: any[]) {
  return { type: 'or', args };
}

export async function setDoc(docRef: any, data: any, options?: any) {
  const parts = docRef.path.split('/');
  await fetch(`/api/data/${parts[0]}/${parts[1]}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  notifyDb(docRef.path);
}

export async function updateDoc(docRef: any, data: any) {
  const parts = docRef.path.split('/');
  await fetch(`/api/data/${parts[0]}/${parts[1]}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  notifyDb(docRef.path);
}

export async function deleteDoc(docRef: any) {
  const parts = docRef.path.split('/');
  await fetch(`/api/data/${parts[0]}/${parts[1]}`, {
    method: 'DELETE'
  });
  notifyDb(docRef.path);
}

function notifyDb(path: string) {
  dbListeners.forEach(l => {
    if (path.startsWith(l.path)) {
      triggerListener(l);
    }
  });
}

export async function getDocs(query: any): Promise<any> {
    const items = await fetchData(query.path, query.constraints);
    return {
        docs: items.map((data: any) => ({
            id: data.id,
            data: () => data
        })),
        empty: items.length === 0
    };
}

export function onSnapshot(queryOrDoc: any, cb: any) {
  let l = { path: queryOrDoc.path, cb, queryParams: queryOrDoc.constraints || [] };
  dbListeners.push(l);
  triggerListener(l);
  
  // Poll every 5 seconds for multi-user updates
  const interval = setInterval(() => triggerListener(l), 5000);
  
  return () => {
    clearInterval(interval);
    let idx = dbListeners.indexOf(l);
    if (idx > -1) dbListeners.splice(idx, 1);
  }
}
