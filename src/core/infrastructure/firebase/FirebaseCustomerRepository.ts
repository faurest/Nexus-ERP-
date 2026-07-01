import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';
import { db } from '../../../lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';

export class FirebaseCustomerRepository implements ICustomerRepository {
  async getCustomers(companyId: string): Promise<any[]> {
    const q = query(collection(db, 'clients'), where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getCustomerById(id: string): Promise<any | null> {
    const docRef = doc(db, 'clients', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() };
  }

  async createCustomer(customer: any): Promise<string> {
    const docRef = await addDoc(collection(db, 'clients'), customer);
    return docRef.id;
  }

  async updateCustomer(id: string, data: any): Promise<void> {
    const docRef = doc(db, 'clients', id);
    await updateDoc(docRef, data);
  }

  async deleteCustomer(id: string): Promise<void> {
    const docRef = doc(db, 'clients', id);
    await deleteDoc(docRef);
  }

  subscribeToCustomers(companyId: string, callback: (customers: any[]) => void): () => void {
    const q = query(collection(db, 'clients'), where('companyId', '==', companyId));
    return onSnapshot(q, (snapshot) => {
      const customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(customers);
    });
  }
}
