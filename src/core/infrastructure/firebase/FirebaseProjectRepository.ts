import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import { db } from '../../../lib/firebase';
import { collection, doc, setDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

export class FirebaseProjectRepository implements IProjectRepository {
  async create(companyId: string, projectData: any): Promise<void> {
    const docRef = doc(collection(db, 'projects'));
    await setDoc(docRef, {
      ...projectData,
      companyId,
      id: docRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  async getProjects(companyId: string): Promise<any[]> {
    const q = query(collection(db, 'projects'), where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}
