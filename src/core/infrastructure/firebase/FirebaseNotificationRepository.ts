import { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import { db } from '../../../lib/firebase';
import { collection, doc, getDocs, addDoc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';

export class FirebaseNotificationRepository implements INotificationRepository {
  async getNotifications(companyId: string, userId?: string): Promise<any[]> {
    let q = query(collection(db, 'notifications'), where('companyId', '==', companyId));
    if (userId) {
      q = query(q, where('userId', '==', userId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async markAsRead(id: string): Promise<void> {
    const docRef = doc(db, 'notifications', id);
    await updateDoc(docRef, { read: true });
  }

  async createNotification(notification: any): Promise<string> {
    const docRef = await addDoc(collection(db, 'notifications'), notification);
    return docRef.id;
  }

  subscribeToNotifications(companyId: string, userId: string, callback: (notifications: any[]) => void): () => void {
    const q = query(collection(db, 'notifications'), where('companyId', '==', companyId), where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(notifications);
    });
  }
}
