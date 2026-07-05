import { IPaymentRepository } from '../../domain/repositories/IPaymentRepository';
import { db } from '../../../lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';

export class FirebasePaymentRepository implements IPaymentRepository {
  async getPayments(companyId: string): Promise<any[]> {
    const q = query(collection(db, 'payments'), where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getPaymentById(companyId: string, id: string): Promise<any | null> {
    const docRef = doc(db, 'payments', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    if (data.companyId !== companyId) return null;
    return { id: snapshot.id, ...data };
  }

  async createPayment(companyId: string, payment: any): Promise<string> {
    const docRef = await addDoc(collection(db, 'payments'), { ...payment, companyId });
    return docRef.id;
  }

  async updatePayment(companyId: string, id: string, data: any): Promise<void> {
    const docRef = doc(db, 'payments', id);
    await updateDoc(docRef, data);
  }

  async deletePayment(companyId: string, id: string): Promise<void> {
    const docRef = doc(db, 'payments', id);
    await deleteDoc(docRef);
  }

  observePayments(companyId: string, callback: (payments: any[]) => void): () => void {
    const q = query(collection(db, 'payments'), where('companyId', '==', companyId));
    return onSnapshot(q, (snapshot) => {
      const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(payments);
    });
  }
}
