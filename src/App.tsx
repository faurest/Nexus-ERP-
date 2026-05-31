import React, { useState, useEffect } from 'react';
import { auth, loginWithGoogle, logout, db, onAuthStateChanged, addDoc, collection, query, where, getDocs, getDoc, doc, updateDoc, arrayUnion, setDoc, serverTimestamp, limit } from './lib/firebase';
type User = any;
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
import { useCompany } from './lib/CompanyContext';

import { authService } from './core/auth/AuthService';
import { LoginScreen } from './modules/auth/components/LoginScreen';
import { WorkspaceSelector } from './modules/companies/components/WorkspaceSelector';
import { DEFAULT_ROLES } from './core/permissions/roles';
import { NexusLogo } from './components/NexusLogo';



export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [slowLoading, setSlowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [helpTopic, setHelpTopic] = useState<string | undefined>(undefined);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const { currentCompany, companies, setCurrentCompany, loading: companyLoading } = useCompany();

  const cleanEmail = user?.email?.trim().toLowerCase().replace(/\s+/g, '') || '';
  const isMaster = cleanEmail === 'hackeurfaurest@gmail.com' || cleanEmail === 'dangafelicite@gmail.com' || cleanEmail === 'yaoubaboubakary43@gmail.com';
  
  const ownedCompanies = companies.filter(c => {
    const cOwnerEmail = c.ownerEmail?.trim().toLowerCase().replace(/\s+/g, '');
    return c.ownerId === user?.uid || (cOwnerEmail && cOwnerEmail === cleanEmail);
  });
  const joinedCompanies = companies.filter(c => {
    const cOwnerEmail = c.ownerEmail?.trim().toLowerCase().replace(/\s+/g, '');
    return c.ownerId !== user?.uid && cOwnerEmail !== cleanEmail;
  });
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
    if (user && currentCompany && !user.role) {
      if (currentCompany.ownerEmail === user.email || currentCompany.ownerId === user.uid || user.email === 'hackeurfaurest@gmail.com' || user.email === 'dangafelicite@gmail.com' || user.email === 'yaoubaboubakary43@gmail.com') {
        setUser(prev => prev ? { ...prev, role: 'owner' } : null);
        setIsBlocked(false);
      } else {
        // Try to find the user in the personnel collection for this company
        const findRole = async () => {
          try {
            const cleanEmail = user.email?.trim().toLowerCase().replace(/\s+/g, '');
            if (!cleanEmail) {
              setIsBlocked(true);
              return;
            }
            const q = query(
              collection(db, 'personnel'), 
              where('companyId', '==', currentCompany.id),
              where('email', '==', cleanEmail),
              limit(1)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
              const memberDoc = snap.docs[0];
              const memberData = memberDoc.data();
              if (memberData.status === 'blocked') {
                setIsBlocked(true);
              } else {
                // Sync the UID and status if not present
                if (memberData.uid !== user.uid || memberData.status !== 'active') {
                  await updateDoc(memberDoc.ref, { 
                    uid: user.uid,
                    status: 'active',
                    updatedAt: serverTimestamp()
                  });
                }

                setUser(prev => prev ? { 
                  ...prev, 
                  role: memberData.role || 'Personnel',
                  customPermissions: memberData.customPermissions || [],
                  email: user.email || memberData.email,
                  nexusId: memberData.id || memberDoc.id
                } : null);
              }
            } else {
               // Match as client
               const clientQ = query(
                 collection(db, 'clients'),
                 where('companyId', '==', currentCompany.id),
                 where('email', '==', cleanEmail),
                 limit(1)
               );
               const clientSnap = await getDocs(clientQ);
               if (!clientSnap.empty) {
                  // Important: Sync the UID and status if not present to ensure security rules work better
                  const clientRef = clientSnap.docs[0].ref;
                  const clientData = clientSnap.docs[0].data();
                  if (clientData.uid !== user.uid || clientData.status !== 'active') {
                    await updateDoc(clientRef, { 
                      uid: user.uid,
                      status: 'active',
                      updatedAt: serverTimestamp()
                    });
                  }
                  
                  // Double check membership in the company document
                  if (!(currentCompany.memberEmails || []).includes(cleanEmail)) {
                    await setDoc(doc(db, 'companies', currentCompany.id), {
                      memberEmails: arrayUnion(cleanEmail),
                      employees: arrayUnion(user.uid),
                      updatedAt: serverTimestamp()
                    }, { merge: true }).catch(e => console.error("Client auto-enroll sync failed", e));
                  }
                  
                  setUser(prev => prev ? { 
                    ...prev, 
                    role: 'Client',
                    email: user.email || clientData.email,
                    nexusId: clientData.id || clientSnap.docs[0].id
                  } : null);
               } else {
                 setIsBlocked(true); // Treat as unauthorized
               }
            }
          } catch (err) {
            console.error("Role lookup failed:", err);
          }
        };
        findRole();
      }
    }
  }, [user, currentCompany]);

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
    const unsubscribe = authService.observeAuthState(async (u) => {
      if (u) {
        setUser(u);
        // Sync user profile to Firestore for notification lookups
        try {
          const rawEmail = u.email || u.providerData?.find((p: any) => p?.email)?.email;
          const cleanEmail = rawEmail ? rawEmail.trim().toLowerCase().replace(/\s+/g, '') : null;
          
          const userId = cleanEmail || u.uid;
          const userRef = doc(db, 'users', userId);
          const userData = {
            uid: u.uid,
            email: cleanEmail,
            displayName: u.displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'Utilisateur Nexus'),
            photoURL: u.photoURL || null,
            lastLogin: serverTimestamp(),
            status: 'active'
          };
          
          await setDoc(userRef, userData, { merge: true });
          
          // Double indexing to avoid duplicates in Admin list when email is discovered later
          if (cleanEmail && userId !== cleanEmail) {
            await setDoc(doc(db, 'users', cleanEmail), userData, { merge: true });
          }
        } catch (err) {
          console.error("Nexus Sync: User profile sync failed", err);
        }
      } else {
        setUser(null);
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

  if (loading || (user && companyLoading)) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="flex flex-col items-center max-w-sm w-full text-center">
          <div className="relative mb-8">
            <NexusLogo className="w-20 h-20 animate-pulse opacity-20" />
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-600/20" />
            </div>
          </div>
          
          <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2 italic uppercase">Symphonie Nexus</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Initialisation de l'écosystème sécurisé...</p>
          
          <AnimatePresence>
            {slowLoading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12 space-y-4 w-full"
              >
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest leading-loose">
                    La connexion au Cloud prend plus de temps que prévu. 
                    Cela peut être dû à votre connexion réseau.
                  </p>
                </div>
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl"
                >
                  Forcer le Redémarrage
                </button>
                <button 
                  onClick={() => auth.signOut()}
                  className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                >
                  Changer de Compte
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="absolute bottom-10 text-[9px] text-slate-300 font-bold uppercase tracking-[0.2em]">
          Nexus ERP Architectural Sync v4.2
        </div>
      </div>
    );
  }

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

  if (!user && !showLogin) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <div className="bg-white border-b border-slate-100 p-4 sticky top-0 z-[100] shadow-sm">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
             <div className="flex items-center gap-3 cursor-pointer">
                <NexusLogo className="w-8 h-8 text-blue-600" />
                <span className="font-black text-slate-800 tracking-tighter">NEXUS MARKETPLACE</span>
             </div>
             <div className="flex items-center gap-4">
               <span className="hidden sm:inline-flex text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                 Employés Nexus ?
               </span>
               <button 
                 onClick={() => setShowLogin(true)}
                 className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all font-sans"
               >
                 Se connecter
               </button>
             </div>
          </div>
        </div>
        <div className="bg-blue-50 border-b border-blue-100 p-3 flex justify-center">
          <p className="text-[11px] font-bold text-blue-800 tracking-wide text-center">
             🚀 Bienvenue sur la Marketplace ! Si vous êtes un employé ou possédez un code d'invitation, cliquez sur "Se connecter" en haut à droite.
          </p>
        </div>
        <Marketplace />
      </div>
    );
  }

  if (!user && showLogin) {
    return <LoginScreen onMarketplace={() => setShowLogin(false)} />;
  }

  if (!currentCompany) {
    return <WorkspaceSelector companies={companies} user={user} onSelect={setCurrentCompany} />;
  }

  if (isBlocked) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-8 border border-red-500/20">
          <ShieldAlert size={40} className="text-red-500 animate-pulse" />
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-4">Accès Interrompu</h1>
        <p className="text-slate-400 max-w-sm font-medium leading-relaxed mb-10">
          Votre compte fait l'objet d'une suspension temporaire ou votre accès à cet espace de travail a été révoqué par la direction. 
          Veuillez contacter votre administrateur système.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => {
              setCurrentCompany(null);
              setIsBlocked(false);
            }}
            className="px-8 py-4 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all font-sans"
          >
            Changer d'Espace
          </button>
          <button 
            onClick={() => auth.signOut()}
            className="px-8 py-4 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl shadow-white/5 font-sans"
          >
            Déconnexion
          </button>
        </div>
        <div className="mt-12 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
          Nexus Security Architecture v5.0
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'marketplace', label: 'Marketplace Public', icon: Store },
    { id: 'services', label: 'Services & Prestations', icon: Layers },
    { id: 'sales', label: 'Ventes & Facturation', icon: TrendingUp },
    { id: 'ecommerce', label: 'E-commerce', icon: ShoppingBag },
    { id: 'clients', label: 'CRM / Clients', icon: Users },
    { id: 'personnel', label: 'Ressources Humaines', icon: Briefcase },
    { id: 'resources', label: 'Stocks & Logistique', icon: Package },
    { id: 'projects', label: 'Projets & Tâches', icon: FolderKanban },
    { id: 'collaboration', label: 'Collaboration & Comm', icon: Handshake },
    { id: 'accounting', label: 'Comptabilité & Finance', icon: Calculator },
    { id: 'guide', label: 'Guide & Performance', icon: BookOpen },
    ...(user.email === 'hackeurfaurest@gmail.com' || user.email === 'dangafelicite@gmail.com' || user.email === 'yaoubaboubakary43@gmail.com' ? [{ id: 'admin', label: 'Administration', icon: Shield }] : []),
  ].filter(item => {
    if (item.id === 'admin') return true;
    const allowedByRole = (currentCompany.roles || DEFAULT_ROLES)[user.role] || ['dashboard'];
    const customPermissions = user.customPermissions || [];
    return allowedByRole.includes(item.id) || customPermissions.includes(item.id);
  });

  return (
    <div className="min-h-screen bg-nexus-bg text-nexus-text font-sans selection:bg-nexus-accent selection:text-white flex overflow-hidden">
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

      <aside 
        style={{
          width: isSidebarOpen ? (windowWidth < 640 ? windowWidth : 320) : (windowWidth < 1024 ? 0 : 100),
          transform: (windowWidth < 1024 && !isSidebarOpen) ? 'translateX(-320px)' : 'translateX(0)'
        }}
        className={cn(
          "bg-[#020617] border border-white/5 flex flex-col z-40 shrink-0 transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden",
          windowWidth < 1024 
            ? "fixed left-0 top-0 h-screen" 
            : "h-[calc(100vh-2rem)] my-4 ml-4 rounded-[2.5rem] sticky top-4",
          isSidebarOpen && windowWidth < 1024 && "rounded-r-[2rem]"
        )}
      >
        {/* Abstract Background Elements for Sidebar */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-600/30 rounded-full blur-[80px]" />
          <div className="absolute bottom-48 -right-12 w-40 h-40 bg-blue-600/20 rounded-full blur-[60px]" />
        </div>

        <div className="p-8 h-28 flex items-center justify-between border-b border-white/5 bg-slate-950/20 relative z-10">
          <div className="flex items-center gap-4 w-full">
            <div 
              className="shrink-0 flex items-center justify-center p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-xl shadow-indigo-900/40 border border-white/10"
            >
              <NexusLogo className="w-8 h-8 filter brightness-200" />
            </div>
            
            {isSidebarOpen && (
              <div 
                className="overflow-hidden flex-1"
              >
                {activeTab === 'admin' ? (
                  <div className="font-black text-indigo-400 text-xl tracking-tighter leading-none italic">
                    NEXUS <span className="text-white not-italic">CORE</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="relative group/select">
                      <select 
                        value={currentCompany.id}
                        onChange={(e) => {
                          const c = companies.find(c => c.id === e.target.value);
                          if (c) setCurrentCompany(c);
                        }}
                        className="font-black text-lg tracking-tight bg-transparent text-white border-none p-0 focus:ring-0 cursor-pointer w-full leading-none appearance-none pr-6 truncate"
                      >
                        {companies.map(c => (
                          <option key={c.id} value={c.id} className="bg-slate-950 text-white font-sans">{c.name}</option>
                        ))}
                      </select>
                      <ChevronRight size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-500 group-hover/select:text-white transition-colors rotate-90" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">{currentCompany.joinCode}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)} 
            className="p-2.5 hover:bg-white/10 text-slate-500 hover:text-white transition-all rounded-xl ml-2 border border-transparent hover:border-white/5 active:scale-95"
          >
            {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 py-8 px-4 space-y-1.5 overflow-y-auto scrollbar-hide relative z-10">
          <div className="space-y-1.5">
            {navItems.map((item, i) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (windowWidth < 1024) setSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-5 px-5 py-4 rounded-2xl transition-all group relative overflow-hidden",
                  activeTab === item.id 
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-[0_10px_30px_rgba(79,70,229,0.3)] border border-indigo-500/50" 
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100 hover:translate-x-1"
                )}
              >
                <div className={cn(
                  "transition-all duration-500",
                  activeTab === item.id ? "text-white scale-110" : "text-slate-500 group-hover:text-indigo-400"
                )}>
                  <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                </div>
                {isSidebarOpen && (
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-[0.2em] shrink-0 transition-colors",
                    activeTab === item.id ? "text-white" : "text-slate-400 group-hover:text-slate-100"
                  )}>{item.label}</span>
                )}
                
                {activeTab === item.id && (
                  <div 
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-l-full shadow-[0_0_15px_#fff]" 
                  />
                )}

                {/* Hover Highlight Overlay */}
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </button>
            ))}
          </div>
        </nav>

        <div className="p-6 border-t border-white/5 flex flex-col gap-3 bg-slate-950/20 relative z-10">
          {user?.role === 'Client' && isSidebarOpen && (
            <div className="mb-2 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1 italic">NEXUS CONNECT</p>
              <p className="text-[10px] text-slate-400 leading-tight">Votre support prioritaire est actif.</p>
              <button 
                onClick={() => setActiveTab('ecommerce')}
                className="mt-3 w-full py-2 bg-indigo-600 text-white text-[9px] font-black uppercase rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-colors"
              >
                Ouvrir Support / Chat
              </button>
            </div>
          )}
          <button 
            onClick={() => setCurrentCompany(null)}
            className="w-full flex items-center gap-5 px-5 py-4 rounded-2xl bg-white/5 text-slate-400 hover:text-white transition-all group border border-white/5 hover:border-white/20 hover:bg-white/10 active:scale-95"
          >
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 border border-white/5 group-hover:border-indigo-500/50 group-hover:text-indigo-400 transition-all">
              <Database size={16} className="group-hover:rotate-12 transition-transform" />
            </div>
            {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-[0.2em]">Changer d'Espace</span>}
          </button>
          
          <button 
            onClick={() => authService.logout().then(() => window.location.reload())}
            className="w-full flex items-center gap-5 px-5 py-4 rounded-2xl text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all group border border-transparent hover:border-red-500/20 active:scale-95"
          >
            <div className="w-8 h-8 flex items-center justify-center rounded-lg group-hover:bg-red-500/10 transition-all">
              <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
            </div>
            {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-[0.2em]">Fin de Session</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col h-screen bg-nexus-bg">
        {/* Top Header */}
        <header className="h-24 px-6 sm:px-12 border-b border-white/5 bg-nexus-surface sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)} 
              className="lg:hidden p-3 bg-nexus-accent text-white rounded-2xl shadow-lg shadow-blue-600/20 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
            >
              <Menu size={20} />
            </button>
            
            {activeTab !== 'dashboard' && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className="hidden sm:flex items-center justify-center w-10 h-10 bg-white/5 border border-white/10 rounded-xl text-nexus-text-muted hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                title="Retour au Tableau de bord"
              >
                <ChevronLeft size={18} />
              </button>
            )}

            <div className="flex flex-col">
              <h2 className="text-[10px] font-black text-nexus-accent uppercase tracking-[0.3em] mb-1">Nexus Cockpit</h2>
              <h1 className="text-xl font-bold text-nexus-text tracking-tight leading-none flex items-center gap-2">
                {activeTab === 'admin' ? "Console Maître" : navItems.find(n => n.id === activeTab)?.label}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div 
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden lg:flex items-center px-4 py-2 bg-white/5 rounded-2xl border border-white/10 group transition-all cursor-pointer hover:border-nexus-accent/50"
            >
              <Search className="text-nexus-text-muted group-hover:text-nexus-accent transition-colors" size={18} />
              <div className="text-[11px] font-bold text-nexus-text-muted w-48 ml-3 flex justify-between items-center">
                <span>Scanner l'écosystème...</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-white/10 rounded border border-white/10">⌘K</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 lg:border-l border-white/5 lg:pl-8">
              <NotificationBell user={user} />
              
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="hidden xs:flex flex-col items-end">
                  <span className="text-[9px] sm:text-[10px] font-black text-nexus-text uppercase tracking-tighter truncate max-w-[80px] sm:max-w-none">
                    {user?.displayName || user?.email?.split('@')[0] || 'Utilisateur'}
                  </span>
                  <span className="text-[7px] sm:text-[8px] font-black text-nexus-accent uppercase tracking-[0.1em] px-1.5 sm:px-2 py-0.5 bg-nexus-accent/10 rounded-full border border-nexus-accent/20 mt-0.5">
                    {user?.role}
                  </span>
                </div>
                <div className="relative group cursor-pointer">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="User" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-[1.25rem] border-2 border-white/10 shadow-xl shadow-slate-950/20 object-cover" />
                  ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-[1.25rem] border-2 border-white/10 shadow-xl shadow-slate-950/20 bg-nexus-surface flex items-center justify-center text-nexus-text-muted font-black text-base sm:text-lg">
                      {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-nexus-success rounded-full border-[3px] border-nexus-surface shadow-sm" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic View */}
        {user && currentCompany && <CriticalNotificationOverlay user={user} />}
        <div className="flex-1 p-4 sm:p-8 pb-32">
          <div
            className="max-w-[1400px] mx-auto"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
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
                {activeTab === 'admin' && (user.email === 'hackeurfaurest@gmail.com' || user.email === 'dangafelicite@gmail.com' || user.email === 'yaoubaboubakary43@gmail.com') && <AdminModule />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <ContextualHelp 
          isOpen={isHelpOpen} 
          onClose={() => setIsHelpOpen(false)} 
          topic={helpTopic}
        />

        {/* Global Footer */}
        <footer className="mt-auto px-4 sm:px-8 py-6 border-t border-white/5 bg-nexus-surface flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6">
            <p className="text-[10px] font-bold text-nexus-text-muted uppercase tracking-widest">Nexus Cockpit v5.0-LEGENDARY</p>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-nexus-success rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-nexus-text uppercase">Sync Intelligence Active</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-[10px] font-bold text-nexus-text-muted hover:text-nexus-text uppercase transition-colors">Support Principal</button>
            <span className="text-white/5">|</span>
            <button className="text-[10px] font-bold text-nexus-text-muted hover:text-nexus-text uppercase transition-colors">Protocole Sécurité</button>
          </div>
        </footer>
      </main>
    </div>
  );
}
