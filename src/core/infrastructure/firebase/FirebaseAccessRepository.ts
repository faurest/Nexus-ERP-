import { IAccessRepository } from '../../domain/repositories/IAccessRepository';
import { db } from '../../../lib/firebase';
import { doc, setDoc, serverTimestamp, query, collection, where, limit, getDocs, updateDoc } from 'firebase/firestore';

export class FirebaseAccessRepository implements IAccessRepository {
  async syncProfile(user: any): Promise<void> {
    try {
      const rawEmail = user.email || user.providerData?.find((p: any) => p?.email)?.email;
      const cleanEmail = rawEmail ? rawEmail.trim().toLowerCase().replace(/\s+/g, '') : null;
      
      const userId = cleanEmail || user.uid;
      const userRef = doc(db, 'users', userId);
      const userData = {
        uid: user.uid,
        email: cleanEmail,
        displayName: user.displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'Utilisateur Nexus'),
        photoURL: user.photoURL || null,
        lastLogin: serverTimestamp(),
        status: 'active'
      };
      
      await setDoc(userRef, userData, { merge: true });
      
      if (cleanEmail && userId !== cleanEmail) {
        await setDoc(doc(db, 'users', cleanEmail), userData, { merge: true });
      }
    } catch (err) {
      console.error("Nexus Sync: User profile sync failed", err);
    }
  }

  async validateWhitelist(email: string, userId: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase().replace(/\s+/g, '');
    
    const personnelQ = query(collection(db, 'personnel'), where('email', '==', normalizedEmail), limit(1));
    const clientQ = query(collection(db, 'clients'), where('email', '==', normalizedEmail), limit(1));

    const [personnelSnap, clientSnap] = await Promise.all([
      getDocs(personnelQ).catch(() => ({ empty: true, docs: [] })),
      getDocs(clientQ).catch(() => ({ empty: true, docs: [] }))
    ]);

    let hasSpecificAccess = false;
    
    if (!personnelSnap.empty) {
      hasSpecificAccess = true;
      const pDoc = (personnelSnap as any).docs[0];
      const pData = pDoc.data();
      if (pData.uid !== userId || pData.status === 'invited') {
        try {
          await updateDoc(pDoc.ref, { 
            uid: userId, 
            status: 'active', 
            updatedAt: serverTimestamp() 
          });
        } catch (e) { /* Ignore */ }
      }
    }

    if (!clientSnap.empty) {
      hasSpecificAccess = true;
      const cDoc = (clientSnap as any).docs[0];
      const cData = cDoc.data();
      if (cData.uid !== userId || cData.status === 'invited') {
        try {
          await updateDoc(cDoc.ref, { 
            uid: userId, 
            status: 'active', 
            updatedAt: serverTimestamp() 
          });
        } catch (e) { /* Ignore */ }
      }
    }

    return hasSpecificAccess;
  }
}
