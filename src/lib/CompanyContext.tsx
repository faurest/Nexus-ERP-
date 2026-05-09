import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, or } from '../lib/firebase';
import { db, auth, onAuthStateChanged } from './firebase';

export interface Company {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  memberEmails?: string[];
  joinCode?: string;
  roles?: Record<string, string[]>;
  employees?: any[];
  createdAt?: any;
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
      
      const isMaster = user.email === 'hackeurfaurest@gmail.com' || user.email === 'dangafelicite@gmail.com';
      
      // Si c'est un maître, on ne filtre pas par ownerId pour voir TOUTES les entreprises (La Pause 237, etc.)
      const q = isMaster 
        ? collection(db, 'companies') 
        : query(
            collection(db, 'companies'), 
            or(
              where('ownerId', '==', user.uid),
              where('memberEmails', 'array-contains', user.email.toLowerCase())
            )
          );
      
      const timer = setTimeout(() => {
        setLoading(currentLoading => {
          if (currentLoading) {
            console.warn("Nexus : Chargement trop long. Vérifiez la connexion Firebase ou les régles de sécurité.");
            return false;
          }
          return currentLoading;
        });
      }, 10000);

      unsubscribeSnap = onSnapshot(q, (snap) => {
        const fetchedCompanies = snap.docs ? snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)) : [];
        
        setCompanies(fetchedCompanies);

        if (fetchedCompanies.length > 0) {
          setCurrentCompany(prev => {
            // Si on est déjà sur la console maître, on n'y bouge pas
            if (prev?.id === 'comp_nexus_master') return prev;

            const savedId = localStorage.getItem('nexus_company_id');
            if (prev && fetchedCompanies.find(c => c.id === prev.id)) {
              return prev;
            }
            if (savedId) {
              const saved = fetchedCompanies.find(c => c.id === savedId);
              if (saved) return saved;
            }
            // Retrait de l'auto-switch vers la seule entreprise pour éviter les surprises
            return prev;
          });
        } else {
          setCurrentCompany(prev => prev?.id === 'comp_nexus_master' ? prev : null);
        }
        
        // CRITICAL: Always stop loading once we have an answer from Firebase
        setLoading(false);
        clearTimeout(timer);
      }, (error) => {
        console.error("Erreur onSnapshot companies:", error);
        setLoading(false);
        clearTimeout(timer);
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
