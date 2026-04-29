let listeners: any[] = [];
let firestoreListeners: any[] = [];

export const auth = {
  currentUser: null as any,
};

export function onAuthStateChanged(authInstance: any, callback: (user: any) => void) {
  listeners.push(callback);
  callback(auth.currentUser);
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

function notifyAuth() {
  listeners.forEach(l => l(auth.currentUser));
}

export async function loginWithEmail(email: string, pass: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass })
  });
  const data = await res.json();
  if (!res.ok) {
     const error: any = new Error(data.error || "Login failed");
     if (data.error === "User not found") error.code = "auth/user-not-found";
     if (data.error === "Invalid password") error.code = "auth/wrong-password";
     throw error;
  }
  auth.currentUser = { uid: data.id || data.uid, email: data.email, displayName: email.split('@')[0] };
  notifyAuth();
  return { user: auth.currentUser };
}

export async function signupWithEmail(email: string, pass: string) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass })
  });
  const data = await res.json();
  if (!res.ok) {
     const error: any = new Error(data.error || "Registration failed");
     if (data.error === "User already exists") error.code = "auth/email-already-in-use";
     throw error;
  }
  auth.currentUser = { uid: data.id || data.uid, email: data.email, displayName: email.split('@')[0] };
  notifyAuth();
  return { user: auth.currentUser };
}

export function logout() {
  auth.currentUser = null;
  notifyAuth();
}

// Firestore mock
export const db = {};
export function collection(db: any, path: string) { return path; }
export function doc(db: any, path: string, id: string) { return `${path}/${id}`; }

export async function addDoc(colPath: string, data: any) {
  const res = await fetch(`/api/${colPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const docData = await res.json();
  return { id: docData.id };
}

export async function setDoc(docPath: string, data: any) {
  await fetch(`/api/${docPath}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function updateDoc(docPath: string, data: any) {
  await fetch(`/api/${docPath}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function deleteDoc(docPath: string) {
  await fetch(`/api/${docPath}`, {
    method: 'DELETE'
  });
}

// Query building
export function query(colPath: string, ...constraints: any[]) {
  return { path: colPath, constraints };
}

export function where(field: string, op: string, value: any) {
  return { field, op, value };
}

export function orderBy(field: string, dir?: string) {
  return { type: 'orderBy', field, dir };
}

export async function getDocs(q: any) {
  const colPath = typeof q === 'string' ? q : q.path;
  
  let url = `/api/${colPath}`;
  if (q.constraints) {
    const searchParams = new URLSearchParams();
    q.constraints.forEach((c: any) => {
      if (c.field && c.op === '==') searchParams.append(c.field, c.value);
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url);
  const data = await res.json();
  return {
    empty: data.length === 0,
    docs: data.map((d: any) => ({
      id: d.id,
      data: () => d
    }))
  };
}

export function arrayUnion(...elements: any[]) {
  return { __arrayUnion: true, elements };
}

export function serverTimestamp() {
  return new Date();
}

export function or(...conditions: any[]) {
  // Not fully supported in weak mock, just returns conditions
  return conditions;
}

export function onSnapshot(q: any, callback: (snap: any) => void) {
  let isCancelled = false;
  
  const pull = async () => {
    if (isCancelled) return;
    try {
      const snap = await getDocs(q);
      callback(snap);
    } catch(e) {}
  };
  
  pull();
  const interval = setInterval(pull, 3000);

  return () => {
    isCancelled = true;
    clearInterval(interval);
  };
}

export const createEmployeeAccount = signupWithEmail;
export const loginWithGoogle = () => { throw new Error("Google login not supported locally") };
