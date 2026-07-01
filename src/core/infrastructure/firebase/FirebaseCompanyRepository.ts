import { ICompanyRepository } from '../../domain/repositories/ICompanyRepository';
import { db } from '../../../lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

export class FirebaseCompanyRepository implements ICompanyRepository {
  async getCompanies(): Promise<any[]> {
    const snapshot = await getDocs(collection(db, 'companies'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getCompanyById(id: string): Promise<any | null> {
    const docRef = doc(db, 'companies', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() };
  }

  async createCompany(company: any): Promise<string> {
    const docRef = await addDoc(collection(db, 'companies'), company);
    return docRef.id;
  }

  async updateCompany(id: string, data: any): Promise<void> {
    const docRef = doc(db, 'companies', id);
    await updateDoc(docRef, data);
  }

  async deleteCompany(id: string): Promise<void> {
    const docRef = doc(db, 'companies', id);
    await deleteDoc(docRef);
  }

  subscribeToCompanies(callback: (companies: any[]) => void): () => void {
    return onSnapshot(collection(db, 'companies'), (snapshot) => {
      const companies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(companies);
    });
  }
}
