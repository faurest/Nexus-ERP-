import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export class FirebaseBootstrapRepo {
  static async syncCompanyRealtime(companyId: string, name: string, ownerId: string): Promise<void> {
    const companyRef = doc(db, 'companies', companyId);
    
    // Idempotency check in Firebase
    const snap = await getDoc(companyRef);
    if (snap.exists() && snap.data().status === 'provisioned') {
       console.log(`[FirebaseBootstrapRepo] Idempotency match: Realtime sync already completed for ${companyId}`);
       return;
    }

    try {
      await setDoc(companyRef, {
        id: companyId,
        name,
        owner_id: ownerId,
        synced_at: serverTimestamp(),
        status: 'provisioned',
        offline_ready: true // Flag to show resilience architecture
      }, { merge: true }); // Merge ensures we don't accidentally overwrite concurrent fields
    } catch (error: any) {
        throw new Error(`[FirebaseBootstrapRepo] Sync Error: ${error.message}`);
    }
  }

  static async rollbackSync(companyId: string): Promise<void> {
    console.warn(`[FirebaseBootstrapRepo] ROLLBACK: Removing synced company ${companyId}`);
    try {
      await deleteDoc(doc(db, 'companies', companyId));
    } catch (e) {
      console.error(`[FirebaseBootstrapRepo] Failed to rollback in Firebase. State might be slightly orphaned but Supabase is clean.`, e);
    }
  }
}
