import { collection, doc, setDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../lib/firebase';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

export class FirebaseUserRepository implements IUserRepository {
  async createUser(email: string, data: any): Promise<void> {
    try {
      const docRef = doc(db, 'users', email);
      await setDoc(docRef, {
        ...data,
        createdAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<any> {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users');
      throw error;
    }
  }
}
