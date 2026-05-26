import { db } from '../../../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

/**
 * Firebase Realtime layer repository for Tenant Provisioning.
 * Used exclusively for syncing state and realtime awareness, not as source of truth.
 */
export class FirebaseRepo {
  static async syncCompanyMetadata(companyId: string, name: string, ownerId: string): Promise<void> {
    const companyRef = doc(db, 'companies', companyId);
    await setDoc(companyRef, {
      id: companyId,
      name,
      owner_id: ownerId,
      synced_at: Date.now(),
      status: 'provisioned'
    });
  }

  static async rollbackCompanySync(companyId: string): Promise<void> {
    console.warn(`[FirebaseRepo] Rolling back company sync for ${companyId}`);
    try {
      const companyRef = doc(db, 'companies', companyId);
      await deleteDoc(companyRef);
    } catch (e) {
      console.error('[FirebaseRepo] Failed to rollback in Firebase', e);
    }
  }
}
