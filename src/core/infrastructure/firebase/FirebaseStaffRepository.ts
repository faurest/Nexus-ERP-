import { IStaffRepository } from '../../domain/repositories/IStaffRepository';
import { db } from '../../../lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';

export class FirebaseStaffRepository implements IStaffRepository {
  async getStaff(companyId: string): Promise<any[]> {
    const q = query(collection(db, 'personnel'), where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getStaffById(id: string): Promise<any | null> {
    const docRef = doc(db, 'personnel', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() };
  }

  async createStaff(staff: any): Promise<string> {
    const docRef = await addDoc(collection(db, 'personnel'), staff);
    return docRef.id;
  }

  async updateStaff(id: string, data: any): Promise<void> {
    const docRef = doc(db, 'personnel', id);
    await updateDoc(docRef, data);
  }

  async deleteStaff(id: string): Promise<void> {
    const docRef = doc(db, 'personnel', id);
    await deleteDoc(docRef);
  }

  subscribeToStaff(companyId: string, callback: (staff: any[]) => void): () => void {
    const q = query(collection(db, 'personnel'), where('companyId', '==', companyId));
    return onSnapshot(q, (snapshot) => {
      const staff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(staff);
    });
  }
}
