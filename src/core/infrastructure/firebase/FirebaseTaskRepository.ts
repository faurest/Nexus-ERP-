import { ITaskRepository } from '../../domain/repositories/ITaskRepository';
import { db } from '../../../lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';

export class FirebaseTaskRepository implements ITaskRepository {
  async getTasks(companyId: string): Promise<any[]> {
    const q = query(collection(db, 'tasks'), where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getTaskById(id: string): Promise<any | null> {
    const docRef = doc(db, 'tasks', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() };
  }

  async createTask(task: any): Promise<string> {
    const docRef = await addDoc(collection(db, 'tasks'), task);
    return docRef.id;
  }

  async updateTask(id: string, data: any): Promise<void> {
    const docRef = doc(db, 'tasks', id);
    await updateDoc(docRef, data);
  }

  async deleteTask(id: string): Promise<void> {
    const docRef = doc(db, 'tasks', id);
    await deleteDoc(docRef);
  }

  subscribeToTasks(companyId: string, callback: (tasks: any[]) => void): () => void {
    const q = query(collection(db, 'tasks'), where('companyId', '==', companyId));
    return onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(tasks);
    });
  }
}
