import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, or } from 'firebase/firestore';
import { db, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

export interface Company {
  id: string;
  name: string;
  ownerId: string;
  memberEmails?: string[];
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
    let unsubscribeSnap: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setCompanies([]);
        handleSetCurrentCompany(null);
        setLoading(false);
        unsubscribeSnap();
        return;
      }

      setLoading(true);
      const q = query(
        collection(db, 'companies'), 
        or(
          where('ownerId', '==', user.uid),
          where('memberEmails', 'array-contains', user.email || '')
        )
      );
      
      unsubscribeSnap = onSnapshot(q, async (snap) => {
        const fetchedCompanies = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
        
        setCompanies(fetchedCompanies);

        if (fetchedCompanies.length > 0) {
          setCurrentCompany(prev => {
            const savedId = localStorage.getItem('nexus_company_id');
            if (prev && fetchedCompanies.find(c => c.id === prev.id)) {
              return prev;
            }
            if (savedId) {
              const saved = fetchedCompanies.find(c => c.id === savedId);
              if (saved) return saved;
            }
            return null; // Forces standard selection screen
          });
        } else {
          setCurrentCompany(null);
        }
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSnap();
    };
  }, []);

  return (
    <CompanyContext.Provider value={{ currentCompany, companies, setCurrentCompany: handleSetCurrentCompany, loading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => useContext(CompanyContext);
