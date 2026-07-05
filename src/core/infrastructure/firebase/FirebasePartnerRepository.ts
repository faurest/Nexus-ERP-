import { IPartnerRepository } from '../../domain/repositories/IPartnerRepository';
import { db } from '../../../lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';

export class FirebasePartnerRepository implements IPartnerRepository {
  async getPartners(companyId: string): Promise<any[]> {
    const q = query(collection(db, 'partners'), where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getPartnerById(companyId: string, id: string): Promise<any | null> {
    const docRef = doc(db, 'partners', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    if (data.companyId !== companyId) return null;
    return { id: snapshot.id, ...data };
  }

  async createPartner(companyId: string, partner: any): Promise<string> {
    const docRef = await addDoc(collection(db, 'partners'), { ...partner, companyId });
    return docRef.id;
  }

  async updatePartner(companyId: string, id: string, data: any): Promise<void> {
    const docRef = doc(db, 'partners', id);
    await updateDoc(docRef, data);
  }

  async deletePartner(companyId: string, id: string): Promise<void> {
    const docRef = doc(db, 'partners', id);
    await deleteDoc(docRef);
  }

  observePartners(companyId: string, callback: (partners: any[]) => void): () => void {
    const q = query(collection(db, 'partners'), where('companyId', '==', companyId));
    return onSnapshot(q, (snapshot) => {
      const partners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(partners);
    });
  }
}
