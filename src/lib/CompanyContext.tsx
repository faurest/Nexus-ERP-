import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, or, getDocs, updateDoc, doc, arrayUnion, serverTimestamp } from '../lib/firebase';
import { db, auth, onAuthStateChanged } from './firebase';

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
    const user = auth.currentUser;
    if (!user || !user.email) return { success: false, message: "Vous devez être connecté." };
    
    const cleanEmail = user.email.trim().toLowerCase().replace(/\s+/g, '');
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
        employees: arrayUnion(user.uid),
        joinCode: cleanCode, // Required by security rules for self-enrollment sync
        updatedAt: serverTimestamp()
      });

      return { success: true, message: `Bienvenue chez ${data.name} !` };
    } catch (error) {
      console.error("Join company error:", error);
      return { success: false, message: "Une erreur est survenue lors de l'adhésion." };
    }
  };

  useEffect(() => {
    let unsubscribeSnap: any = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
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
          console.log("Nexus Sync: Initialisation du flux pour", cleanEmail);
          
          if (isMaster) {
            return onSnapshot(collection(db, 'companies'), (snap) => {
              const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
              console.log("Nexus Sync: Master Access -", data.length, "entités détectées.");
              setCompanies(data);
              setLoading(false);
            }, (err) => {
              console.error("Master onSnapshot error:", err);
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

          if (personnelCompanyIds.length > 0) {
             console.log("Nexus Sync: Synchronisation des affiliations RH...", personnelCompanyIds.length);
          }

          return onSnapshot(qMain, (snap) => {
            const mainCompanies = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
            
            if (personnelCompanyIds.length > 0) {
              personnelCompanyIds.forEach(async (cid) => {
                if (!mainCompanies.find(c => c.id === cid)) {
                  try {
                    await updateDoc(doc(db, 'companies', cid), {
                      memberEmails: arrayUnion(cleanEmail),
                      employees: arrayUnion(user.uid),
                      updatedAt: serverTimestamp()
                    });
                  } catch (e) {
                    // Silently fail if we can't update due to RLS
                  }
                }
              });
            }

            console.log("Nexus Sync: Infrastructure synchronisée -", mainCompanies.length, "entités.");
            setCompanies(mainCompanies);
            setLoading(false);
          }, (err) => {
            console.error("Main onSnapshot error:", err);
            setLoading(false);
          });
        } catch (error) {
          console.error("Load companies error:", error);
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
        console.error("Critical failure during company load:", e);
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
