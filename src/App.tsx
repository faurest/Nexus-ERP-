import React, { useState, useEffect } from 'react';
import { auth, loginWithGoogle, logout, db, onAuthStateChanged, addDoc, collection, query, where, getDocs, getDoc, doc, updateDoc, arrayUnion, setDoc, serverTimestamp, limit } from './lib/firebase';
type User = any;
import { syncUserProfile, type UserProfile } from './lib/userService';
import { MASTER_EMAILS } from './lib/store';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Package, 
  FolderKanban, 
  Handshake, 
  LogOut, 
  Menu, 
  X,
  Plus,
  Search,
  Bell,
  ChevronRight,
  ChevronLeft,
  DownloadCloud,
  TrendingUp,
  AlertCircle,
  Building2,
  Shield,
  ShieldAlert,
  Calculator,
  Activity,
  Layers,
  FileText,
  Database,
  MessageSquare,
  ShoppingBag,
  Store,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Modules
import DashboardModule from './components/DashboardModule';
import PersonnelModule from './components/PersonnelModule';
import ClientModule from './components/ClientModule';
import ResourceModule from './components/ResourceModule';
import ProjectModule from './components/ProjectModule';
import SalesModule from './components/SalesModule';
import AdminModule from './components/AdminModule';
import AccountingModule from './components/AccountingModule';
import PrestationsModule from './components/PrestationsModule';
import EcommerceModule from './components/EcommerceModule';
import CollaborationModule from './components/CollaborationModule';
import CommunicationModule from './components/CommunicationModule';
import Marketplace from './components/Marketplace';
import GuideModule from './components/GuideModule';
import ContextualHelp from './components/ContextualHelp';
import NotificationBell from './components/NotificationBell';
import CriticalNotificationOverlay from './components/CriticalNotificationOverlay';
import CommandPalette from './components/CommandPalette';

import { bootstrapDemoData } from './lib/bootstrap';
import { useTheme } from './lib/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';
import { Button, Card, Input, Badge } from './components/NexusUI';
import { useCompany } from './lib/CompanyContext';

export const NexusLogo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="primary" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0EA5E9" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
      <linearGradient id="secondary" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#6EE7B7" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    
    <g transform="translate(60, 60)">
      {/* Outer Orbit */}
      <circle cx="0" cy="0" r="45" fill="none" stroke="url(#primary)" strokeWidth="2" strokeDasharray="8 6" opacity="0.4" />
      
      {/* Connecting nodes */}
      <circle cx="0" cy="-45" r="4" fill="#0EA5E9" />
      <circle cx="39" cy="22.5" r="4" fill="#2563EB" />
      <circle cx="-39" cy="22.5" r="4" fill="#38BDF8" />

      {/* Inner geometric structure */}
      <path d="M0 -25 L21.6 12.5 L-21.6 12.5 Z" fill="none" stroke="url(#secondary)" strokeWidth="4" strokeLinejoin="round" />
      
      <path d="M0 -45 L0 -25" stroke="url(#secondary)" strokeWidth="3" opacity="0.6"/>
      <path d="M39 22.5 L21.6 12.5" stroke="url(#secondary)" strokeWidth="3" opacity="0.6"/>
      <path d="M-39 22.5 L-21.6 12.5" stroke="url(#secondary)" strokeWidth="3" opacity="0.6"/>

      {/* The Core */}
      <circle cx="0" cy="0" r="12" fill="url(#primary)" filter="url(#glow)" />
      <circle cx="0" cy="0" r="6" fill="#FFFFFF" />
    </g>
  </svg>
);

export const DEFAULT_ROLES: Record<string, string[]> = {
  'owner': ['dashboard', 'services', 'sales', 'ecommerce', 'clients', 'personnel', 'resources', 'projects', 'accounting', 'collaboration', 'communication', 'guide'],
  'Directeur': ['dashboard', 'services', 'sales', 'ecommerce', 'clients', 'personnel', 'resources', 'projects', 'accounting', 'collaboration', 'communication', 'guide'],
  'Administrateur': ['dashboard', 'services', 'sales', 'ecommerce', 'clients', 'personnel', 'resources', 'projects', 'accounting', 'collaboration', 'communication', 'guide'],
  'Secrétaire': ['dashboard', 'services', 'sales', 'ecommerce', 'clients', 'personnel', 'resources', 'projects', 'accounting', 'collaboration', 'communication', 'guide'],
  'Comptable': ['dashboard', 'services', 'sales', 'ecommerce', 'projects', 'accounting', 'collaboration', 'communication', 'guide'],
  'Agent Commercial': ['dashboard', 'services', 'sales', 'ecommerce', 'clients', 'projects', 'collaboration', 'communication', 'guide'],
  'Collaborateur': ['dashboard', 'services', 'sales', 'ecommerce', 'clients', 'personnel', 'resources', 'projects', 'accounting', 'collaboration', 'communication', 'guide'],
  'Personnel': ['dashboard', 'services', 'sales', 'ecommerce', 'clients', 'personnel', 'resources', 'projects', 'accounting', 'collaboration', 'communication', 'guide'],
  'Client': ['dashboard', 'ecommerce'],
};

function SkeletonCard() {
  return (
    <div className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-slate-100 rounded" />
          <div className="h-3 w-16 bg-slate-50 rounded" />
        </div>
      </div>
      <div className="w-4 h-4 bg-slate-50 rounded" />
    </div>
  );
}

function WorkspaceSelector({ companies, user, onSelect }: { companies: any[], user: User, onSelect: any }) {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { currentCompany, joinCompany, createCompany } = useCompany();

  useEffect(() => {
    if (!user || !companies.length || currentCompany) return; 
    const savedId = localStorage.getItem('nexus_company_id') || localStorage.getItem('nexus_last_company_id');
    if (companies.length === 1) {
      onSelect(companies[0]);
    } else if (savedId) {
      const found = companies.find(c => c.id === savedId);
      if (found) onSelect(found);
    }
  }, [companies, user, currentCompany]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg-main transition-colors relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-nexus-primary/20 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-nexus-accent/20 rounded-full blur-[100px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-6">
             <NexusLogo className="w-16 h-16" />
          </div>
          <h1 className="text-3xl font-black text-text-main tracking-tight uppercase">SÉLECTION D'ESPACE</h1>
          <p className="text-sm text-text-muted font-medium italic text-center">Accédez à votre infrastructure de performance.</p>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'select' && (
            <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                {companies.map((c) => (
                  <Card key={c.id} className="p-6 cursor-pointer group flex items-center justify-between hover:border-nexus-primary transition-all bg-surface/50 backdrop-blur-md" onClick={() => onSelect(c)}>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-nexus-primary/10 rounded-2xl flex items-center justify-center text-nexus-primary font-black text-xl group-hover:bg-nexus-primary group-hover:text-white transition-all shadow-inner">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-1 text-left">
                        <h3 className="font-black text-lg text-text-main group-hover:text-nexus-primary transition-colors text-left">{c.name}</h3>
                        <div className="flex items-center gap-2">
                           <Badge variant="info">{c.joinCode}</Badge>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="text-text-muted group-hover:translate-x-1 transition-transform" />
                  </Card>
                ))}
                {companies.length === 0 && (
                  <div className="py-12 text-center text-text-muted opacity-50 space-y-4">
                    <p className="font-black uppercase tracking-widest text-xs">Aucun espace rattaché</p>
                    <p className="text-[10px] italic">Utilisez un code ou créez votre entreprise pour commencer.</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <Button variant="secondary" onClick={() => setMode('join')} leftIcon={<Users size={16} />}>REJOINDRE</Button>
                <Button onClick={() => setMode('create')} leftIcon={<Plus size={16} />}>CRÉER</Button>
              </div>
            </motion.div>
          )}

          {mode === 'create' && (
            <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="p-10 space-y-8 bg-surface/80 backdrop-blur-xl text-center">
                 <div className="text-center space-y-2">
                    <Building2 className="w-12 h-12 mx-auto text-nexus-primary" />
                    <h2 className="text-xl font-bold text-text-main uppercase">Initialisation Engine</h2>
                    <p className="text-xs text-text-muted italic">Spécifiez le nom de votre nouvelle entité commerciale.</p>
                 </div>
                 <div className="space-y-4">
                   <Input placeholder="Nom de l'entreprise" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} className="h-14 text-lg font-bold" />
                   <Button className="w-full h-14" isLoading={submitting} disabled={!newCompanyName} onClick={async () => {
                      setSubmitting(true);
                      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
                      const result = await createCompany(newCompanyName, code);
                      if (result.success) onSelect({ id: result.id, name: newCompanyName, ownerId: user.uid, joinCode: code });
                      else setErrorMsg("Échec de création");
                      setSubmitting(false);
                    }}>DÉPLOYER L'ESPACE</Button>
                   <Button variant="ghost" onClick={() => setMode('select')} className="w-full">RETOUR</Button>
                 </div>
              </Card>
            </motion.div>
          )}

          {mode === 'join' && (
            <motion.div key="join" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="p-10 space-y-8 bg-surface/80 backdrop-blur-xl text-center">
                 <div className="text-center space-y-2">
                    <Shield size={12} className="mx-auto text-nexus-accent mb-2" />
                    <h2 className="text-xl font-bold text-text-main uppercase">Authentification Hub</h2>
                    <p className="text-xs text-text-muted italic">Entrez le code d'activation fourni par votre organisation.</p>
                 </div>
                 <div className="space-y-4">
                   <Input placeholder="CODE D'ACCÈS" value={joinCodeInput} onChange={(e) => setJoinCodeInput(e.target.value)} className="h-16 text-center text-2xl font-black tracking-[0.5em] focus:tracking-[0.6em] transition-all uppercase" />
                   <Button className="w-full h-14 bg-nexus-accent hover:bg-nexus-accent/90" isLoading={submitting} disabled={!joinCodeInput} onClick={async () => {
                      setSubmitting(true);
                      const result = await joinCompany(joinCodeInput);
                      if (result.success) setMode('select');
                      else setErrorMsg(result.message);
                      setSubmitting(false);
                    }}>VÉRIFIER & CONNECTER</Button>
                   {errorMsg && <p className="text-nexus-danger text-[10px] font-black text-center uppercase tracking-widest">{errorMsg}</p>}
                   <Button variant="ghost" onClick={() => setMode('select')} className="w-full">RETOUR</Button>
                 </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-center gap-8 pt-12">
           <ThemeToggle />
           <Button variant="ghost" size="sm" onClick={logout} leftIcon={<LogOut size={14} />}>Déconnexion</Button>
        </div>
      </motion.div>
    </div>
  );
}

function LoginScreen({ onMarketplace }: { onMarketplace: () => void }) {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleGoogleLogin = async () => {
    setAuthError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      setAuthError('Échec de la connexion. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg-main transition-colors overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-nexus-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-nexus-accent/20 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md space-y-12 relative z-10">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-6">
             <div className="w-20 h-20 bg-nexus-primary rounded-3xl flex items-center justify-center shadow-2xl shadow-nexus-primary/30 rotate-3 hover:rotate-0 transition-transform duration-500">
                <NexusLogo className="w-10 h-10 brightness-200" />
             </div>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-text-main uppercase italic leading-none">
            Nexus <span className="nexus-gradient-text not-italic">OS</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted">Intelligence Opérationnelle Unifiée</p>
        </div>

        <Card className="p-10 space-y-8 bg-surface/80 backdrop-blur-xl">
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-bold text-text-main uppercase">Accès Hub Personnel</h2>
            <p className="text-xs text-text-muted font-medium italic">Connectez-vous pour synchroniser vos opérations.</p>
          </div>

          <div className="space-y-4">
            <Button onClick={handleGoogleLogin} isLoading={loading} className="w-full h-14" leftIcon={<img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />}>
              Démarrer la Session
            </Button>
            <Button variant="ghost" onClick={onMarketplace} className="w-full h-12 text-[10px]" rightIcon={<ChevronRight size={14} />}>
              Explorer le Marketplace Public
            </Button>
          </div>

          {authError && <p className="text-nexus-danger text-[10px] font-black text-center uppercase tracking-widest">{authError}</p>}

          <div className="flex justify-center pt-4">
            <ThemeToggle />
          </div>
        </Card>

        <div className="text-center pt-12 space-y-4">
          <div className="flex items-center justify-center gap-3 opacity-40">
            <Shield size={12} className="text-nexus-primary" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-text-main">End-to-End Encryption Active</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [slowLoading, setSlowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [helpTopic, setHelpTopic] = useState<string | undefined>(undefined);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const { currentCompany, companies, setCurrentCompany, loading: companyLoading, isMaster } = useCompany();

  const [backClickCount, setBackClickCount] = useState(0);
  const [toast, setToast] = useState<{ message: string, type: 'info' | 'success' | 'warn' } | null>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'warn' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Navigation Stack Management for Back Button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state) {
        const { companyId, tab } = e.state;
        if (companyId) {
          const comp = companies.find(c => c.id === companyId);
          if (comp) {
            setCurrentCompany(comp);
            if (tab) setActiveTab(tab);
          }
        } else {
          setCurrentCompany(null);
        }
      } else {
        // We are at root (selection screen)
        if (!currentCompany) {
          setBackClickCount(prev => prev + 1);
          setTimeout(() => setBackClickCount(0), 2000);
          
          if (backClickCount === 0) {
            // Push state back once to "prevent" immediate exit and show message
            window.history.pushState(null, '');
            showToast("Appuyez encore pour quitter Nexus ERP", 'info');
          }
        } else {
          setCurrentCompany(null);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [companies, setCurrentCompany, currentCompany, backClickCount]);

  useEffect(() => {
    // Pulse state to browser history
    const state = { 
      companyId: currentCompany?.id || null, 
      tab: activeTab 
    };
    
    const currentState = window.history.state;
    if (!currentState || currentState.companyId !== state.companyId || currentState.tab !== state.tab) {
      window.history.pushState(state, '');
    }

    // Save for Quick Resume
    if (currentCompany?.id) {
      localStorage.setItem('nexus_last_company_id', currentCompany.id);
      localStorage.setItem('nexus_last_tab', activeTab);
    }
  }, [currentCompany?.id, activeTab]);

  useEffect(() => {
    // Check for auto-navigation from Quick Resume
    const navTo = localStorage.getItem('nexus_navigate_to');
    if (navTo && currentCompany) {
      setActiveTab(navTo);
      localStorage.removeItem('nexus_navigate_to');
    }
  }, [currentCompany]);

  const cleanEmail = user?.email?.trim().toLowerCase().replace(/\s+/g, '') || '';
  
  const allAffiliatedCompanies = companies;
  
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading || (user && companyLoading)) {
      const timer = setTimeout(() => {
        setSlowLoading(true);
      }, 6000);
      return () => clearTimeout(timer);
    } else {
      setSlowLoading(false);
    }
  }, [loading, user, companyLoading]);

  useEffect(() => {
    const handleOpenHelp = (e: any) => {
      setHelpTopic(e.detail);
      setIsHelpOpen(true);
    };
    const handleNavigate = (e: any) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('OPEN_HELP', handleOpenHelp);
    window.addEventListener('NAVIGATE_TAB', handleNavigate);
    return () => {
      window.removeEventListener('OPEN_HELP', handleOpenHelp);
      window.removeEventListener('NAVIGATE_TAB', handleNavigate);
    };
  }, []);

  useEffect(() => {
    if (isMaster) {
      setIsWhitelisted(true);
      return;
    }

    const checkWhitelist = async () => {
      if (!user?.email || !user?.uid) return;
      
      const normalizedEmail = user.email.trim().toLowerCase().replace(/\s+/g, '');

      try {
        console.log("Nexus Security: Analyse des accès pour", normalizedEmail);
        
        // Use targeted lookups
        const [personnelDocSnap, clientDocSnap] = await Promise.all([
          getDoc(doc(db, 'personnel', normalizedEmail)).catch(() => null),
          getDoc(doc(db, 'clients', normalizedEmail)).catch(() => null)
        ]);

        let hasSpecificAccess = false;
        
        if (personnelDocSnap?.exists()) {
          hasSpecificAccess = true;
          const pData = personnelDocSnap.data();
          if (pData.uid !== user.uid || pData.status === 'invited') {
            try {
              await updateDoc(doc(db, 'personnel', normalizedEmail), { 
                uid: user.uid, 
                status: 'active', 
                updatedAt: serverTimestamp() 
              });
            } catch (e) { /* Ignore background update fail */ }
          }
        }

        if (clientDocSnap?.exists()) {
          hasSpecificAccess = true;
          const cData = clientDocSnap.data();
          if (cData.uid !== user.uid || cData.status === 'invited') {
            try {
              await updateDoc(doc(db, 'clients', normalizedEmail), { 
                uid: user.uid, 
                status: 'active', 
                updatedAt: serverTimestamp() 
              });
            } catch (e) { /* Ignore background update fail */ }
          }
        }

        // Final decision logic
        const hasCompanies = companies && companies.length > 0;
        console.log("Nexus Security: Analyse terminée. Access:", hasSpecificAccess || hasCompanies);
        
        if (hasSpecificAccess || hasCompanies) {
          setIsWhitelisted(true);
        } else {
          setIsWhitelisted(false);
        }
      } catch (err) {
        console.error("Whitelist check failed:", err);
        setIsWhitelisted(false);
      }
    };
    checkWhitelist();
  }, [user?.email, user?.uid, companies.length, isMaster]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (user && currentCompany) {
      // 1. Check if Master/Owner
      const userEmail = user.email?.trim().toLowerCase().replace(/\s+/g, '') || '';
      const isOwner = currentCompany.ownerEmail?.trim().toLowerCase().replace(/\s+/g, '') === userEmail || 
                      currentCompany.ownerId === user.uid || 
                      isMaster;

      if (isOwner) {
        setUser((prev: any) => prev ? { ...prev, role: 'owner' } : null);
        setIsBlocked(false);
      } else {
        // 2. Check cached membership (Faster, especially for multi-tenant)
        if (currentCompany.company_members && currentCompany.company_members.length > 0) {
           const member = currentCompany.company_members[0];
           if (member.status === 'blocked' && !isMaster) {
             setIsBlocked(true);
           } else {
             setUser((prev: any) => prev ? { 
               ...prev, 
               role: member.role || 'Personnel',
               isCollaborator: true 
             } : null);
             setIsBlocked(false);
             return;
           }
        }

        // 3. Fallback: Robust recovery via DB
        const findRole = async () => {
          try {
            if (!userEmail) {
              setIsBlocked(true);
              return;
            }
            
            // Try Personnel first
            const q = query(
              collection(db, 'personnel'), 
              where('companyId', '==', currentCompany.id),
              where('email', '==', userEmail),
              limit(1)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
              const memberDoc = snap.docs[0];
              const memberData = memberDoc.data();
              if (memberData.status === 'blocked') {
                setIsBlocked(true);
              } else {
                // Auto-repair Firestore record with UID
                if (memberData.uid !== user.uid) {
                  await updateDoc(memberDoc.ref, { uid: user.uid, updatedAt: serverTimestamp() });
                }
                setUser((prev: any) => prev ? { ...prev, role: memberData.role || 'Personnel' } : null);
                setIsBlocked(false);
              }
              return;
            }

            // Then check Client record
            const clientQ = query(
              collection(db, 'clients'),
              where('companyId', '==', currentCompany.id),
              where('email', '==', userEmail),
              limit(1)
            );
            const clientSnap = await getDocs(clientQ);
            if (!clientSnap.empty) {
              const clientData = clientSnap.docs[0].data();
              setUser((prev: any) => prev ? { 
                ...prev, 
                role: 'Client',
                email: user.email || clientData.email,
                nexusId: clientData.id || clientSnap.docs[0].id
              } : null);
              setIsBlocked(false);
            } else {
              // If we reached here but companies list said they are members, trust the context but default role
              setUser((prev: any) => prev ? { ...prev, role: 'Personnel' } : null);
              setIsBlocked(false);
            }
          } catch (err) {
            console.error("Nexus Role Recovery Error:", err);
            setIsBlocked(true);
          }
        };
        findRole();
      }
    }
  }, [user?.uid, currentCompany?.id, isMaster]);

  useEffect(() => {
    // Handle master switch from AdminModule
    const handleStorageChange = () => {
      const switchReq = localStorage.getItem('nexus_switch_company');
      if (switchReq) {
        const company = JSON.parse(switchReq);
        setCurrentCompany(company);
        localStorage.removeItem('nexus_switch_company');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    handleStorageChange(); // Check on mount
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [setCurrentCompany]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const profile = await syncUserProfile(u);
        setUserProfile(profile);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    
    // Test Firestore connection on load
    import('./lib/firebase').then(({ testFirestoreConnection }) => {
      testFirestoreConnection();
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user && user.role && currentCompany) {
      const allowed = (currentCompany.roles || DEFAULT_ROLES)[user.role] || ['dashboard'];
      if (!allowed.includes(activeTab) && activeTab !== 'admin') {
        setActiveTab(allowed[0] || 'dashboard');
      }
    }
  }, [user, currentCompany, activeTab]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#020617] p-8 relative overflow-hidden font-sans">
        {/* Cinematic Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-[60vh] h-[60vh] bg-blue-600/10 rounded-full blur-[140px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[50vh] h-[50vh] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
        </div>

        <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative mb-16"
          >
            <NexusLogo className="w-28 h-28" />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-6 border border-dashed border-blue-500/30 rounded-full"
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-10 border border-dotted border-indigo-500/20 rounded-full"
            />
          </motion.div>
          
          <div className="space-y-6 w-full">
            <div className="text-center">
              <h2 className="text-4xl font-black text-white tracking-tighter mb-2 italic uppercase">Nexus <span className="text-blue-500 not-italic">OS</span></h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">INITIALISATION DE L'ÉCOSYSTÈME SÉCURISÉ</p>
            </div>

            <div className="space-y-4 w-full">
              <div className="flex justify-between items-end px-1">
                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest animate-pulse">Sync avec l'Intelligence Hub...</span>
                <span className="text-[10px] font-black text-slate-600 uppercase">Crypté</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                 <motion.div 
                   initial={{ width: "0%" }}
                   animate={{ width: "100%" }}
                   transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                   className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-[0_0_15px_#2563eb]"
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                    <div className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">Auth Engine</div>
                    <div className="text-[9px] font-black text-blue-500 uppercase truncate">Synchronisé</div>
                 </div>
                 <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                    <div className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">Data Stream</div>
                    <div className="text-[9px] font-black text-emerald-500 uppercase truncate">Sécurisé</div>
                 </div>
              </div>
            </div>
            
            {slowLoading && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="pt-4 flex flex-col gap-3"
              >
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                   <p className="text-[10px] text-amber-400 font-medium leading-relaxed">La synchronisation prend plus de temps que prévu. Vérifiez votre connexion Nexus.</p>
                </div>
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white rounded-xl transition-all border border-white/5"
                >
                   Forcer la Synchronisation
                </button>
              </motion.div>
            )}
          </div>
        </div>
        
        <div className="absolute bottom-12 flex flex-col items-center gap-4">
           <div className="flex items-center gap-2">
              <Shield size={12} className="text-blue-500" />
              <span className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em]">End-to-End Encryption v5.0 Active</span>
           </div>
        </div>
      </div>
    );
  }

  // If user is logged in but company data is loading, we can show a partial launcher 
  // with a loading state inside it rather than a full screen blocker.
  // This allows the user to see the "Launcher" environment immediately.

  if (showMarketplace) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <div className="bg-white border-b border-slate-100 p-4 sticky top-0 z-[100] shadow-sm">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
             <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowMarketplace(false)}>
                <NexusLogo className="w-8 h-8" />
                <span className="font-black text-slate-800 tracking-tighter">NEXUS OPERATIONAL</span>
             </div>
             <button 
               onClick={() => setShowMarketplace(false)}
               className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all font-sans"
             >
               Espace Connexion
             </button>
          </div>
        </div>
        <Marketplace onBack={() => setShowMarketplace(false)} />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onMarketplace={() => setShowMarketplace(true)} />;
  }

  if (!currentCompany) {
    return <WorkspaceSelector companies={companies} user={user} onSelect={setCurrentCompany} />;
  }

  if (isBlocked) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-bg-main p-6 text-center space-y-8">
        <div className="w-24 h-24 bg-nexus-danger/10 text-nexus-danger rounded-full flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <ShieldAlert size={48} />
        </div>
        <div className="space-y-4 max-w-md">
          <h2 className="text-3xl font-black text-text-main uppercase tracking-tighter italic">Accès Interdit</h2>
          <p className="text-text-muted font-medium italic">Votre profil nexus n&apos;est pas autorisé à accéder à cette infrastructure. Contactez votre administrateur réseau.</p>
        </div>
        <Button variant="secondary" onClick={() => setCurrentCompany(null)} leftIcon={<ChevronLeft size={16} />}>RETOUR HUB</Button>
      </div>
    );
  }

  const allowedModules = (currentCompany.roles || DEFAULT_ROLES)[user.role || 'Personnel'] || ['dashboard'];
  if (isMaster && !allowedModules.includes('admin')) {
    allowedModules.push('admin');
  }
  
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { id: 'sales', icon: TrendingUp, label: 'Ventes & CRM' },
    { id: 'ecommerce', icon: ShoppingBag, label: 'E-commerce' },
    { id: 'services', icon: Briefcase, label: 'Prestations' },
    { id: 'clients', icon: Users, label: 'Clients' },
    { id: 'personnel', icon: Activity, label: 'Ressources Humaines' },
    { id: 'resources', icon: Package, label: 'Stocks & Logistique' },
    { id: 'projects', icon: FolderKanban, label: 'Projets' },
    { id: 'accounting', icon: Calculator, label: 'Comptabilité' },
    { id: 'collaboration', icon: MessageSquare, label: 'Collaboration' },
    { id: 'marketplace', icon: Store, label: 'Nexus Store' },
    { id: 'guide', icon: BookOpen, label: 'Guide & Protocoles' },
    ...(isMaster ? [{ id: 'admin', icon: Shield, label: 'Administration' }] : []),
  ].filter(item => allowedModules.includes(item.id) || item.id === 'dashboard');

  return (
    <div className="min-h-screen bg-bg-main flex overflow-hidden font-sans selection:bg-nexus-primary/30 text-text-main">
      {/* Command Cockpit */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tab) => setActiveTab(tab)}
        user={user}
      />

      {/* Sidebar - Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-900/40 z-30"
        />
      )}

      {/* Sidebar */}
      {/* Sidebar Overlay for Mobile */}
      {windowWidth < 1024 && isSidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 z-30"
        />
      )}

      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? (windowWidth < 1024 ? '85%' : '300px') : '0px' }}
        className={cn(
          "fixed lg:relative z-50 h-full bg-surface border-r border-border backdrop-blur-xl flex flex-col transition-all overflow-hidden",
          !isSidebarOpen && "lg:w-0 border-none"
        )}
      >
        <div className="p-6 flex items-center justify-between border-b border-border bg-surface/50">
          <div className="flex items-center gap-3">
            <NexusLogo className="w-10 h-10" />
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tighter leading-none italic text-text-main uppercase">NEXUS <span className="text-nexus-primary not-italic">OS</span></span>
              <span className="text-[8px] font-black text-text-muted uppercase tracking-[0.2em] mt-1">Enterprise Cloud Engine</span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-text-muted hover:text-text-main transition-colors">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (windowWidth < 1024) setSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all relative group",
                activeTab === item.id 
                  ? "bg-nexus-primary text-white shadow-xl shadow-nexus-primary/20" 
                  : "text-text-muted hover:bg-surface-accent hover:text-text-main"
              )}
            >
              <item.icon size={20} className={cn("shrink-0", activeTab === item.id ? "text-white" : "group-hover:text-nexus-primary transition-colors")} />
              <span className="text-[11px] font-black uppercase tracking-widest truncate">{item.label}</span>
              {activeTab === item.id && (
                <motion.div layoutId="nav-indicator" className="absolute left-0 w-1 h-6 bg-white rounded-r-full shadow-[0_0_10px_#fff]" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-border space-y-4 bg-surface/50">
          <Card className="p-4 bg-nexus-primary/5 border-nexus-primary/10 group cursor-pointer hover:border-nexus-primary/30 transition-all font-sans" onClick={() => setCurrentCompany(null)}>
             <div className="flex items-center gap-3 px-0">
                <div className="w-10 h-10 bg-nexus-primary/10 rounded-xl flex items-center justify-center text-nexus-primary font-black text-lg shadow-inner shrink-0">
                   {currentCompany.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                   <p className="text-[8px] font-black text-nexus-primary gap-1 flex items-center mb-1">
                      <Shield size={8} /> SESSION ACTIVE
                   </p>
                   <p className="text-[11px] font-black text-text-main truncate uppercase">{currentCompany.name}</p>
                </div>
             </div>
             <p className="text-[9px] text-text-muted mt-3 italic font-medium">Changer d&apos;espace de travail &rarr;</p>
          </Card>
          
          <div className="flex items-center justify-between px-2 pt-2">
            <ThemeToggle />
            <button onClick={logout} className="p-3 text-text-muted hover:text-nexus-danger transition-colors rounded-xl hover:bg-nexus-danger/5 active:scale-95">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 border-b border-border bg-surface/80 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className={cn("p-2.5 bg-surface-accent text-text-main rounded-xl hover:bg-surface-hover transition-all lg:hidden")}>
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center gap-4 px-4 h-11 bg-bg-main border border-border rounded-2xl cursor-pointer hover:border-nexus-primary/50 transition-all group w-64 lg:w-96" onClick={() => setIsCommandPaletteOpen(true)}>
               <Search size={18} className="text-text-muted group-hover:text-nexus-primary transition-colors" />
               <span className="text-[11px] font-black text-text-muted uppercase tracking-widest">Recherche Nexus...</span>
               <div className="ml-auto flex gap-1">
                  <span className="px-1.5 py-0.5 bg-surface border border-border rounded-md text-[8px] font-black text-text-muted">CMD</span>
                  <span className="px-1.5 py-0.5 bg-surface border border-border rounded-md text-[8px] font-black text-text-muted">K</span>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell user={user} />
            <div className="h-10 w-[1px] bg-border mx-2" />
            <div className="flex items-center gap-3 pl-2 group cursor-pointer">
              <div className="text-right hidden sm:block">
                <p className="text-[11px] font-black text-text-main uppercase tracking-tighter leading-none">{userProfile?.fullName || user.displayName || 'Opérateur'}</p>
                <Badge variant="info" className="mt-1 text-[8px]">{user.role || 'Personnel'}</Badge>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-nexus-primary/10 border border-nexus-primary/20 flex items-center justify-center font-black text-nexus-primary shadow-inner overflow-hidden">
                {user.photoURL ? <img src={user.photoURL} alt="User" /> : (userProfile?.fullName?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          {user && currentCompany && <CriticalNotificationOverlay user={user} />}
          
          <div className="p-6 md:p-10 pb-36 max-w-7xl mx-auto w-full">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeTab === 'dashboard' && <DashboardModule user={user} companies={companies} />}
              {activeTab === 'marketplace' && <Marketplace onBack={() => setActiveTab('dashboard')} />}
              {activeTab === 'services' && <PrestationsModule />}
              {activeTab === 'sales' && <SalesModule user={user} />}
              {activeTab === 'ecommerce' && <EcommerceModule user={user} />}
              {activeTab === 'clients' && <ClientModule />}
              {activeTab === 'personnel' && <PersonnelModule user={user} />}
              {activeTab === 'resources' && <ResourceModule user={user} />}
              {activeTab === 'projects' && <ProjectModule />}
              {activeTab === 'accounting' && <AccountingModule />}
              {activeTab === 'collaboration' && <CollaborationModule />}
              {activeTab === 'guide' && <GuideModule />}
              {activeTab === 'admin' && isMaster && <AdminModule />}
            </motion.div>
          </div>
        </div>

        {/* Global Bottom Navigation for Mobile */}
        <div className="lg:hidden fixed bottom-6 left-6 right-6 h-16 bg-surface/80 backdrop-blur-xl border border-border rounded-3xl flex items-center justify-around px-4 z-[100] shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
           {[
             { id: 'dashboard', icon: LayoutDashboard },
             { id: 'sales', icon: TrendingUp },
             { id: 'ecommerce', icon: ShoppingBag },
             { id: 'personnel', icon: Activity },
             { id: 'marketplace', icon: Store }
           ].map(item => (
             <button
               key={item.id}
               onClick={() => setActiveTab(item.id)}
               className={cn(
                 "p-3 rounded-2xl transition-all relative",
                 activeTab === item.id ? "text-nexus-primary bg-nexus-primary/10 shadow-inner" : "text-text-muted"
               )}
             >
               <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
               {activeTab === item.id && (
                 <motion.div layoutId="mobile-indicator" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-nexus-primary rounded-full shadow-[0_0_10px_#0EA5E9]" />
               )}
             </button>
           ))}
        </div>

        <footer className="mt-auto px-10 py-8 border-t border-border bg-surface flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
               <div className="w-2 h-2 bg-nexus-success rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Système Nexus Sécurisé 5.0</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="sm" className="text-[9px]" rightIcon={<Activity size={12} />}>HUB STATUS</Button>
            <div className="w-[1px] h-4 bg-border" />
            <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.3em]">&copy; 2024 NEXUS CORP. INTERFACE INDUSTRIELLE.</p>
          </div>
        </footer>

        <ContextualHelp 
          isOpen={isHelpOpen} 
          onClose={() => setIsHelpOpen(false)} 
          topic={helpTopic}
        />

        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200]"
            >
              <Card className={cn(
                "px-8 py-4 bg-surface/90 backdrop-blur-xl border flex items-center gap-4 shadow-2xl min-w-[300px]",
                toast.type === 'info' ? "border-nexus-primary/30" : "",
                toast.type === 'success' ? "border-nexus-success/30" : "",
                toast.type === 'warn' ? "border-nexus-warning/30" : ""
              )}>
                 <NexusLogo className="w-6 h-6" />
                 <span className="text-[11px] font-black uppercase tracking-widest text-text-main">{toast.message}</span>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
