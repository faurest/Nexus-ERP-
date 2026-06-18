import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, or, getDocs, updateDoc, setDoc, doc, arrayUnion, serverTimestamp } from '../lib/firebase';
import { db } from './firebase';
import { authService } from '../core/auth/AuthService';

export interface CompanyCategory {
  name: string;
  isPriority: boolean;
  icon?: string;
}

export interface Company {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  memberEmails?: string[];
  joinCode?: string;
  roles?: Record<string, string[]>;
  deliveryFees?: Record<string, number>;
  employees?: any[];
  createdAt?: any;
  whatsappNumber?: string;
  nairaRate?: number;
  totalProfit?: number;
  categories?: CompanyCategory[];
  logo?: string;
  description?: string;
  objectives?: string;
}

interface CompanyContextType {
  currentCompany: Company | null;
  companies: Company[];
  setCurrentCompany: (company: Company | null) => void;
  joinCompany: (code: string) => Promise<{ success: boolean; message: string }>;
  loading: boolean;
}

const CompanyContext = createContext<CompanyContextType>({
  currentCompany: null,
  companies: [],
  setCurrentCompany: () => {},
  joinCompany: async () => ({ success: false, message: 'Not implemented' }),
  loading: true,
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSetCurrentCompany = (company: Company | null) => {
    setCurrentCompany(company);
    if (company) {
      localStorage.setItem('nexus_company_id', company.id);
    } else {
      localStorage.removeItem('nexus_company_id');
    }
  };

  const joinCompany = async (code: string): Promise<{ success: boolean; message: string }> => {
    const session = authService.getCurrentUser();
    if (!session || !session.email) return { success: false, message: "Vous devez être connecté." };
    
    const cleanEmail = session.email.trim().toLowerCase().replace(/\s+/g, '');
    const cleanCode = code.trim();

    try {
      const q = query(collection(db, 'companies'), where('joinCode', '==', cleanCode));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        return { success: false, message: "Code d'accès invalide. Vérifiez auprès de votre responsable." };
      }

      const companyDoc = snap.docs[0];
      const companyId = companyDoc.id;
      const data = companyDoc.data();

      if (data.memberEmails?.includes(cleanEmail)) {
        return { success: true, message: "Vous êtes déjà membre de cette entreprise." };
      }

      await updateDoc(doc(db, 'companies', companyId), {
        memberEmails: arrayUnion(cleanEmail),
        employees: arrayUnion(session.id || (session as any).uid),
        joinCode: cleanCode, // Required by security rules for self-enrollment sync
        updatedAt: serverTimestamp()
      });

      // Check if personnel record already exists (invited by admin)
      const { setDoc, getDoc } = await import('firebase/firestore');
      const personnelRef = doc(db, 'personnel', `${companyId}_${cleanEmail}`);
      const personnelSnap = await getDoc(personnelRef);
      
      if (personnelSnap.exists()) {
        await setDoc(personnelRef, {
          uid: session.id || (session as any).uid,
          status: 'active',
          joinMethod: 'invite_code',
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await setDoc(personnelRef, {
          companyId: companyId,
          uid: session.id || (session as any).uid,
          email: cleanEmail,
          name: session.displayName || cleanEmail.split('@')[0],
          role: 'Personnel',
          status: 'active',
          joinMethod: 'invite_code',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      return { success: true, message: `Bienvenue chez ${data.name} !` };
    } catch (error) {
      console.warn("Join company warning:", error);
      return { success: false, message: "Une erreur est survenue lors de l'adhésion." };
    }
  };

  useEffect(() => {
    let unsubscribeSnap: any = null;

    const unsubscribeAuth = authService.observeAuthState(async (user) => {
      // Cleanup previous snapshot if exists
      if (typeof unsubscribeSnap === 'function') {
        unsubscribeSnap();
        unsubscribeSnap = null;
      }

      if (!user) {
        setCompanies([]);
        handleSetCurrentCompany(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      
      const cleanEmail = user.email.trim().toLowerCase().replace(/\s+/g, '');
      const isMaster = cleanEmail === 'hackeurfaurest@gmail.com' || cleanEmail === 'dangafelicite@gmail.com' || cleanEmail === 'yaoubaboubakary43@gmail.com';
      
      const load = async () => {
        try {
          if (isMaster) {
            return onSnapshot(collection(db, 'companies'), (snap) => {
              setCompanies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
              setLoading(false);
            }, (err) => {
              console.warn("Master onSnapshot warning:", err);
              setLoading(false);
            });
          }

          const qMain = query(
            collection(db, 'companies'), 
            or(
              where('ownerId', '==', user.uid),
              where('memberEmails', 'array-contains', cleanEmail)
            )
          );

          // Get personnel IDs once to assist with auto-sync
          const qPersonnel = query(collection(db, 'personnel'), where('email', '==', cleanEmail));
          const personnelSnap = await getDocs(qPersonnel).catch(() => ({ docs: [], empty: true }));
          const personnelCompanyIds = personnelSnap.docs.map(d => d.data().companyId).filter(Boolean);

          return onSnapshot(qMain, (snap) => {
            const mainCompanies = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
            
            if (personnelCompanyIds.length > 0) {
              personnelCompanyIds.forEach(async (cid) => {
                if (!mainCompanies.find(c => c.id === cid)) {
                  try {
                    await setDoc(doc(db, 'companies', cid), {
                      memberEmails: arrayUnion(cleanEmail),
                      employees: arrayUnion(user.uid),
                      updatedAt: serverTimestamp()
                    }, { merge: true });
                  } catch (e) {
                    // Silently fail if we can't update
                  }
                }
              });
            }

            setCompanies(mainCompanies);
            setLoading(false);
          }, (err) => {
            console.warn("Main onSnapshot warning:", err);
            setLoading(false);
          });
        } catch (error) {
          console.warn("Load companies warning:", error);
          setLoading(false);
        }
      };

      // Faster timeout for loading state to reveal selection screen even if Firestore is slow
      const timer = setTimeout(() => {
        setLoading(false);
      }, 5000);

      try {
        const unsubscribe = await load();
        unsubscribeSnap = unsubscribe;
      } catch (e) {
        console.warn("Critical failure during company load warning:", e);
        setLoading(false);
      }
      
      // We don't clear the timeout immediately if we want to ensure at least some visual feedback time, 
      // but if load finishes, we can clear it. Actually, clearing it is fine.
      clearTimeout(timer);
    });

    return () => {
      unsubscribeAuth();
      if (typeof unsubscribeSnap === 'function') {
        unsubscribeSnap();
      }
    };
  }, []);

  return (
    <CompanyContext.Provider value={{ currentCompany, companies, setCurrentCompany: handleSetCurrentCompany, joinCompany, loading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => useContext(CompanyContext);
