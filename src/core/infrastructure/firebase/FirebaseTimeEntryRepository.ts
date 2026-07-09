import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../lib/firebase';
import { ITimeEntryRepository } from '../../domain/repositories/ITimeEntryRepository';

export class FirebaseTimeEntryRepository implements ITimeEntryRepository {
  private collectionName = 'time_entries';

  async create(data: any): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...data,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, this.collectionName);
      throw error;
    }
  }

  async update(id: string, data: any): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, this.collectionName);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, this.collectionName);
      throw error;
    }
  }

  async getById(id: string): Promise<any> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, this.collectionName);
      throw error;
    }
  }

  async list(companyId: string): Promise<any[]> {
    try {
      const q = query(collection(db, this.collectionName), where('companyId', '==', companyId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, this.collectionName);
      throw error;
    }
  }

  observe(companyId: string, callback: (items: any[]) => void): () => void {
    const q = query(collection(db, this.collectionName), where('companyId', '==', companyId));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(items);
    }, (error) => {
      console.error(`Error observing ${this.collectionName}:`, error);
    });
  }
}
