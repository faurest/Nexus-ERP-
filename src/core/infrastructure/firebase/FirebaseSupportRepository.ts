import { ISupportRepository } from '../../domain/repositories/ISupportRepository';
import { db } from '../../../lib/firebase';
import { collection, doc, setDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';

export class FirebaseSupportRepository implements ISupportRepository {
  async createTicket(companyId: string, ticketData: any): Promise<void> {
    const docRef = doc(collection(db, 'support_tickets'));
    await setDoc(docRef, {
      ...ticketData,
      companyId,
      id: docRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  observeTickets(companyId: string, callback: (tickets: any[]) => void): () => void {
    const q = query(collection(db, 'support_tickets'), where('companyId', '==', companyId));
    return onSnapshot(q, (snapshot) => {
      const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(tickets);
    });
  }
}
