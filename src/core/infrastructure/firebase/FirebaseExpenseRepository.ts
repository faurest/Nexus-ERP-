import { IExpenseRepository } from '../../domain/repositories/IExpenseRepository';
import { db } from '../../../lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';

export class FirebaseExpenseRepository implements IExpenseRepository {
  async getExpenses(companyId: string): Promise<any[]> {
    const q = query(collection(db, 'expenses'), where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getExpenseById(companyId: string, id: string): Promise<any | null> {
    const docRef = doc(db, 'expenses', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    if (data.companyId !== companyId) return null;
    return { id: snapshot.id, ...data };
  }

  async createExpense(companyId: string, expense: any): Promise<string> {
    const docRef = await addDoc(collection(db, 'expenses'), { ...expense, companyId });
    return docRef.id;
  }

  async updateExpense(companyId: string, id: string, data: any): Promise<void> {
    const docRef = doc(db, 'expenses', id);
    await updateDoc(docRef, data);
  }

  async deleteExpense(companyId: string, id: string): Promise<void> {
    const docRef = doc(db, 'expenses', id);
    await deleteDoc(docRef);
  }

  observeExpenses(companyId: string, callback: (expenses: any[]) => void): () => void {
    const q = query(collection(db, 'expenses'), where('companyId', '==', companyId));
    return onSnapshot(q, (snapshot) => {
      const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(expenses);
    });
  }
}
