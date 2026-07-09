import { ISaleRepository } from '../../domain/repositories/ISaleRepository';
import { db } from '../../../lib/firebase';
import { collection, doc, setDoc, getDocs, getDoc, query, where, serverTimestamp, updateDoc, deleteDoc, onSnapshot, addDoc } from 'firebase/firestore';

export class FirebaseSaleRepository implements ISaleRepository {
  async create(companyId: string, data: any): Promise<string> {
    const docRef = await addDoc(collection(db, 'sales'), {
      ...data,
      companyId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  }
  async update(companyId: string, id: string, data: any): Promise<void> {
    const docRef = doc(db, 'sales', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }
  async delete(companyId: string, id: string): Promise<void> {
    const docRef = doc(db, 'sales', id);
    await deleteDoc(docRef);
  }
  async get(companyId: string, id: string): Promise<any> {
    const docRef = doc(db, 'sales', id);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  }
  async list(companyId: string): Promise<any[]> {
    const q = query(collection(db, 'sales'), where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  observe(companyId: string, callback: (items: any[]) => void): () => void {
    const q = query(collection(db, 'sales'), where('companyId', '==', companyId));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(items);
    });
  }
}
