import { IResourceRepository } from '../../domain/repositories/IResourceRepository';
import { db } from '../../../lib/firebase';
import { collection, doc, setDoc, getDocs, getDoc, query, where, serverTimestamp, updateDoc, deleteDoc, onSnapshot, addDoc } from 'firebase/firestore';

export class FirebaseResourceRepository implements IResourceRepository {
  async create(companyId: string, data: any): Promise<string> {
    const docRef = await addDoc(collection(db, 'resources'), {
      ...data,
      companyId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  }
  async update(companyId: string, id: string, data: any): Promise<void> {
    const docRef = doc(db, 'resources', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }
  async delete(companyId: string, id: string): Promise<void> {
    const docRef = doc(db, 'resources', id);
    await deleteDoc(docRef);
  }
  async get(companyId: string, id: string): Promise<any> {
    const docRef = doc(db, 'resources', id);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  }
  async list(companyId: string): Promise<any[]> {
    const q = query(collection(db, 'resources'), where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  observe(companyId: string, callback: (items: any[]) => void): () => void {
    const q = query(collection(db, 'resources'), where('companyId', '==', companyId));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(items);
    });
  }
}
