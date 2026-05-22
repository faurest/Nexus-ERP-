import { getSupabase } from '../lib/supabase';
import { db, collection, addDoc, serverTimestamp, getDocs, query, where, doc } from '../lib/firebase';

export const companiesApi = {
    async createCompany(name: string, ownerId: string, ownerEmail: string, joinCode: string) {
        // Core business logic to create a company across firebase and supabase
        const docRef = await addDoc(collection(db, 'companies'), {
            name,
            ownerId,
            ownerEmail,
            joinCode,
            createdAt: serverTimestamp()
        });
        
        return docRef.id;
    },

    async fetchUserCompanies(companyIds: string[]) {
         if (!companyIds.length) return [];
         
         const q = query(
             collection(db, 'companies'),
             where('__name__', 'in', companyIds)
         );
         const snap = await getDocs(q);
         return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
};
