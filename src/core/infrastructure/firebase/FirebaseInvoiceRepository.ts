import { IInvoiceRepository } from '../../domain/repositories/IInvoiceRepository';
import { db } from '../../../lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';

export class FirebaseInvoiceRepository implements IInvoiceRepository {
  async getInvoices(companyId: string): Promise<any[]> {
    const q = query(collection(db, 'sales_invoices'), where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getInvoiceById(id: string): Promise<any | null> {
    const docRef = doc(db, 'sales_invoices', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() };
  }

  async createInvoice(invoice: any): Promise<string> {
    const docRef = await addDoc(collection(db, 'sales_invoices'), invoice);
    return docRef.id;
  }

  async updateInvoice(id: string, data: any): Promise<void> {
    const docRef = doc(db, 'sales_invoices', id);
    await updateDoc(docRef, data);
  }

  async deleteInvoice(id: string): Promise<void> {
    const docRef = doc(db, 'sales_invoices', id);
    await deleteDoc(docRef);
  }

  subscribeToInvoices(companyId: string, callback: (invoices: any[]) => void): () => void {
    const q = query(collection(db, 'sales_invoices'), where('companyId', '==', companyId));
    return onSnapshot(q, (snapshot) => {
      const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(invoices);
    });
  }
}
