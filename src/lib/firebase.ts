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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (error) {
    if (error.message.toLowerCase().includes('invalid login credentials')) {
       return signupWithEmail(email, pass);
    }
    const err: any = new Error(error.message);
    err.code = 'auth/' + error.status;
    throw err;
  }

  if (data.user) {
    currentUser = {
      uid: data.user.id,
      email: data.user.email,
      displayName: data.user.user_metadata?.displayName || data.user.email?.split('@')[0]
    };
    
    // Synchro avec la table users publique pour l'admin
    try {
      await supabase.from('users').upsert({
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        updatedAt: serverTimestamp()
      }, { onConflict: 'uid' });
    } catch (e) {
      console.warn("Synchro users table échouée, continue...", e);
    }

    notifyAuth();
  }
  return { user: currentUser };
};

export async function signupWithEmail(email: string, pass: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
    options: {
      data: {
        displayName: email.split('@')[0]
      }
    }
  });

  if (error) {
    const err: any = new Error(error.message);
    err.code = 'auth/' + error.status;
    throw err;
  }

  if (data.user) {
    currentUser = {
      uid: data.user.id,
      email: data.user.email,
      displayName: data.user.user_metadata?.displayName || data.user.email?.split('@')[0]
    };

    // Synchro avec la table users publique
    try {
      await supabase.from('users').insert([{
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        createdAt: serverTimestamp()
      }]);
    } catch (e) {
      console.warn("User record creation failed:", e);
    }

    notifyAuth();
  }
  return { user: currentUser };
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
  const { data: result, error } = await supabase
    .from(col.path)
    .insert([{ ...data, createdAt: serverTimestamp() }])
    .select();

  if (error) {
    console.error("Supabase addDoc error:", error);
    throw error;
  }
  
  if (!result || result.length === 0) {
    throw new Error("Supabase n'a pas renvoyé de données après l'insertion.");
  }
  
  notifyDb(col.path);
  return { id: result[0].id };
}

export function or(...args: any[]) {
  return { type: 'or', args };
}

export async function setDoc(docRef: any, data: any, options?: any) {
  const parts = docRef.path.split('/');
  const table = parts[0];
  const id = parts[1];

  const { error } = await supabase
    .from(table)
    .upsert({ id, ...data, updatedAt: serverTimestamp() });

  if (error) throw error;
  notifyDb(docRef.path);
}

export async function updateDoc(docRef: any, data: any) {
  const parts = docRef.path.split('/');
  const table = parts[0];
  const id = parts[1];

  const { error } = await supabase
    .from(table)
    .update(data)
    .eq('id', id);

  if (error) throw error;
  notifyDb(docRef.path);
}

export async function deleteDoc(docRef: any) {
  const parts = docRef.path.split('/');
  const table = parts[0];
  const id = parts[1];

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);

  if (error) throw error;
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
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      l.cb({
        id,
        exists: () => !!data,
        data: () => data
      });
    } else {
      let q: any = supabase.from(table).select('*');
      
      if (l.queryParams) {
        l.queryParams.forEach((qConstraint: any) => {
          if (qConstraint.type === 'where' && qConstraint.op === '==') {
            q = q.eq(qConstraint.field, qConstraint.value);
          }
        });
      }

      const { data, error } = await q;
      if (error) throw error;
      
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
    const parts = query.path.split('/');
    const table = parts[0];
    
    let q: any = supabase.from(table).select('*');
    if (query.constraints) {
        query.constraints.forEach((c: any) => {
            if (c.type === 'where' && c.op === '==') {
                q = q.eq(c.field, c.value);
            }
        });
    }

    const { data, error } = await q;
    if (error) throw error;

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
