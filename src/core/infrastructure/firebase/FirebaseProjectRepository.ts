import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import { db } from '../../../lib/firebase';
import { collection, doc, setDoc, getDocs, query, where, serverTimestamp, updateDoc, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';

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
  async update(companyId: string, id: string, projectData: any): Promise<void> {
    const docRef = doc(db, 'projects', id);
    await updateDoc(docRef, {
      ...projectData,
      updatedAt: serverTimestamp()
    });
  }
  async delete(companyId: string, id: string): Promise<void> {
    const docRef = doc(db, 'projects', id);
    await deleteDoc(docRef);
  }
  async getProject(companyId: string, id: string): Promise<any> {
    const docRef = doc(db, 'projects', id);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  }
  observeProjects(companyId: string, callback: (projects: any[]) => void): () => void {
    const q = query(collection(db, 'projects'), where('companyId', '==', companyId));
    return onSnapshot(q, (snapshot) => {
      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(projects);
    });
  }
}
