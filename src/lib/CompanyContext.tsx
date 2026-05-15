import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, or } from '../lib/firebase';
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
  loading: boolean;
}

const CompanyContext = createContext<CompanyContextType>({
  currentCompany: null,
  companies: [],
  setCurrentCompany: () => {},
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
          if (isMaster) {
            return onSnapshot(collection(db, 'companies'), (snap) => {
              setCompanies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
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

          const qPersonnel = query(collection(db, 'personnel'), where('email', '==', cleanEmail));
          const personnelSnap = await getDocs(qPersonnel);
          const personnelCompanyIds = personnelSnap.docs.map(d => d.data().companyId).filter(Boolean);

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
                    console.warn("Auto-sync failed for company", cid, e);
                  }
                }
              });
            }

            setCompanies(mainCompanies);
            setLoading(false);
          });
        } catch (error) {
          console.error("Load companies error:", error);
          setLoading(false);
        }
      };

      unsubscribeSnap = await load();
    });

    return () => {
      unsubscribeAuth();
      if (typeof unsubscribeSnap === 'function') {
        unsubscribeSnap();
      }
    };
  }, []);

  return (
    <CompanyContext.Provider value={{ currentCompany, companies, setCurrentCompany: handleSetCurrentCompany, loading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => useContext(CompanyContext);
