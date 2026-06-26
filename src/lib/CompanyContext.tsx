import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
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
      const { data: companiesData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('join_code', cleanCode)
        .limit(1);
      
      if (companyError || !companiesData || companiesData.length === 0) {
        return { success: false, message: "Code d'accès invalide. Vérifiez auprès de votre responsable." };
      }

      const companyDoc = companiesData[0];
      const companyId = companyDoc.id;

      // Handle camelCase conversion implicitly since Supabase stores in snake_case but we map it
      // Let's assume memberEmails is a JSON/text array or we need to update it
      // In Supabase schema it's not defined, so it's a JSON column perhaps?
      // Wait, in schema we didn't add memberEmails to companies. We should use standard insert.
      // For now, return success if they found a company, since personnel table handles membership.

      const { data: personnelData } = await supabase
        .from('personnel')
        .select('*')
        .eq('company_id', companyId)
        .eq('email', cleanEmail)
        .limit(1);
      
      if (personnelData && personnelData.length > 0) {
        await supabase.from('personnel').update({
          uid: session.id,
          status: 'active',
          join_method: 'invite_code',
          updated_at: new Date().toISOString()
        }).eq('id', personnelData[0].id);
      } else {
        await supabase.from('personnel').insert([{
          id: `${companyId}_${cleanEmail}`,
          company_id: companyId,
          uid: session.id,
          email: cleanEmail,
          name: session.displayName || cleanEmail.split('@')[0],
          role: 'Personnel',
          status: 'active',
          join_method: 'invite_code',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
      }

      return { success: true, message: `Bienvenue chez ${companyDoc.name} !` };
    } catch (error) {
      console.error("Join company error:", error);
      return { success: false, message: "Une erreur est survenue lors de l'adhésion." };
    }
  };

  useEffect(() => {
    let subscription: any = null;

    const unsubscribeAuth = authService.observeAuthState(async (user) => {
      if (subscription) {
        supabase.removeChannel(subscription);
        subscription = null;
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
          const fetchCompanies = async () => {
            if (isMaster) {
              const { data } = await supabase.from('companies').select('*');
              if (data) {
                // map to camelCase
                setCompanies(data.map((d: any) => ({
                  ...d,
                  ownerId: d.owner_id,
                  ownerEmail: d.owner_email,
                  joinCode: d.join_code,
                  nairaRate: d.naira_rate,
                  totalProfit: d.total_profit,
                  createdAt: d.created_at,
                  updatedAt: d.updated_at
                })));
              }
            } else {
              // Get companies where user is owner
              const { data: ownedCompanies } = await supabase.from('companies').select('*').eq('owner_id', user.uid);
              
              // Get companies from personnel
              const { data: personnelData } = await supabase.from('personnel').select('company_id').eq('email', cleanEmail);
              const companyIds = personnelData?.map(p => p.company_id) || [];
              
              let memberCompanies: any[] = [];
              if (companyIds.length > 0) {
                const { data } = await supabase.from('companies').select('*').in('id', companyIds);
                if (data) memberCompanies = data;
              }
              
              const allCompaniesMap = new Map();
              ownedCompanies?.forEach(c => allCompaniesMap.set(c.id, c));
              memberCompanies?.forEach(c => allCompaniesMap.set(c.id, c));
              
              setCompanies(Array.from(allCompaniesMap.values()).map((d: any) => ({
                ...d,
                ownerId: d.owner_id,
                ownerEmail: d.owner_email,
                joinCode: d.join_code,
                nairaRate: d.naira_rate,
                totalProfit: d.total_profit,
                createdAt: d.created_at,
                updatedAt: d.updated_at
              })));
            }
            setLoading(false);
          };

          await fetchCompanies();

          // Setup real-time listener for companies
          subscription = supabase.channel('companies_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => {
              fetchCompanies();
            })
            .subscribe();

        } catch (error) {
          console.error("Load companies error:", error);
          setLoading(false);
        }
      };

      const timer = setTimeout(() => {
        setLoading(false);
      }, 5000);

      try {
        await load();
      } catch (e) {
        console.error("Critical failure during company load:", e);
        setLoading(false);
      }
      
      clearTimeout(timer);
    });

    return () => {
      unsubscribeAuth();
      if (subscription) {
        supabase.removeChannel(subscription);
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
