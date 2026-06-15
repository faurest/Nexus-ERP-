import React, { useState, useEffect } from 'react';
import { auth, loginWithGoogle, logout, db, onAuthStateChanged, addDoc, collection, query, where, getDocs, getDoc, doc, updateDoc, arrayUnion, setDoc, serverTimestamp, limit, onSnapshot } from './lib/firebase';
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



import { ThemeToggle } from './components/ThemeToggle';
import { useThemeStore } from './store/themeStore';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [slowLoading, setSlowLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [activeTab, setActiveTabState] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    const [mainTab] = hash.split('/');
    return mainTab || 'dashboard';
  });

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    const hash = window.location.hash.replace('#', '');
    const [mainTab] = hash.split('/');
    if (mainTab !== tab) {
      window.history.pushState(null, '', `#${tab}`);
    }
  };

  useEffect(() => {
    const handleNavigationOptions = () => {
      const hash = window.location.hash.replace('#', '');
      const [mainTab] = hash.split('/');
      setActiveTabState(mainTab || 'dashboard');
    };
    window.addEventListener('popstate', handleNavigationOptions);
    window.addEventListener('hashchange', handleNavigationOptions);
    return () => {
      window.removeEventListener('popstate', handleNavigationOptions);
      window.removeEventListener('hashchange', handleNavigationOptions);
    };
  }, []);

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
  const { isDark } = useThemeStore();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

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
        const personnelQ = query(collection(db, 'personnel'), where('email', '==', normalizedEmail), limit(1));
        const clientQ = query(collection(db, 'clients'), where('email', '==', normalizedEmail), limit(1));

        const [personnelSnap, clientSnap] = await Promise.all([
          getDocs(personnelQ).catch(() => ({ empty: true, docs: [] })),
          getDocs(clientQ).catch(() => ({ empty: true, docs: [] }))
        ]);

        let hasSpecificAccess = false;
        
        if (!personnelSnap.empty) {
          hasSpecificAccess = true;
          const pDoc = (personnelSnap as any).docs[0];
          const pData = pDoc.data();
          if (pData.uid !== user.uid || pData.status === 'invited') {
            try {
              await updateDoc(pDoc.ref, { 
                uid: user.uid, 
                status: 'active', 
                updatedAt: serverTimestamp() 
              });
            } catch (e) { /* Ignore background update fail */ }
          }
        }

        if (!clientSnap.empty) {
          hasSpecificAccess = true;
          const cDoc = (clientSnap as any).docs[0];
          const cData = cDoc.data();
          if (cData.uid !== user.uid || cData.status === 'invited') {
            try {
              await updateDoc(cDoc.ref, { 
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
    let unsubscribeRole: any = null;
    let unsubscribeClientRole: any = null;

    if (user?.uid && currentCompany?.id) {
      const cleanEmail = user.email?.trim().toLowerCase().replace(/\s+/g, '');
      const isMaster = currentCompany.ownerEmail === user.email || currentCompany.ownerId === user.uid || user.email === 'hackeurfaurest@gmail.com' || user.email === 'dangafelicite@gmail.com' || user.email === 'yaoubaboubakary43@gmail.com';

      if (isMaster) {
        setUser(prev => {
          if (!prev) return null;
          if (prev.role === 'owner') return prev;
          return { ...prev, role: 'owner' };
        });
        setIsBlocked(false);
      } else if (cleanEmail) {
        // Try to find the user in the personnel collection for this company
        const q = query(
          collection(db, 'personnel'), 
          where('companyId', '==', currentCompany.id),
          where('email', '==', cleanEmail),
          limit(1)
        );

        unsubscribeRole = onSnapshot(q, async (snap) => {
          if (!snap.empty) {
            const memberDoc = snap.docs[0];
            const memberData = memberDoc.data();
            if (memberData.status === 'blocked') {
              setIsBlocked(true);
            } else {
              // Sync the UID and status if not present
              if (memberData.uid !== user.uid || memberData.status !== 'active') {
                try {
                  await updateDoc(memberDoc.ref, { 
                    uid: user.uid,
                    status: 'active',
                    updatedAt: serverTimestamp()
                  });
                } catch (e) { /* ignore */ }
              }

              setUser(prev => {
                if (!prev) return null;
                const newRole = memberData.role || 'Personnel';
                const newPermissions = memberData.customPermissions || [];
                const newEmail = user.email || memberData.email;
                const newNexusId = memberData.id || memberDoc.id;
                
                // Shallow compare to prevent unnecessary rerenders
                if (
                  prev.role === newRole && 
                  prev.nexusId === newNexusId && 
                  prev.email === newEmail &&
                  JSON.stringify(prev.customPermissions || []) === JSON.stringify(newPermissions)
                ) {
                   return prev;
                }
                
                return { 
                  ...prev, 
                  role: newRole,
                  customPermissions: newPermissions,
                  email: newEmail,
                  nexusId: newNexusId
                };
              });
              setIsBlocked(false);
            }
          } else {
             // Match as client
             const clientQ = query(
               collection(db, 'clients'),
               where('companyId', '==', currentCompany.id),
               where('email', '==', cleanEmail),
               limit(1)
             );
             
             unsubscribeClientRole = onSnapshot(clientQ, async (clientSnap) => {
               if (!clientSnap.empty) {
                  const clientRef = clientSnap.docs[0].ref;
                  const clientData = clientSnap.docs[0].data();
                  if (clientData.uid !== user.uid || clientData.status !== 'active') {
                    try {
                      await updateDoc(clientRef, { 
                        uid: user.uid,
                        status: 'active',
                        updatedAt: serverTimestamp()
                      });
                    } catch (e) { /* ignore */ }
                  }
                  
                  // Double check membership in the company document
                  if (!(currentCompany.memberEmails || []).includes(cleanEmail)) {
                    await setDoc(doc(db, 'companies', currentCompany.id), {
                      memberEmails: arrayUnion(cleanEmail),
                      employees: arrayUnion(user.uid),
                      updatedAt: serverTimestamp()
                    }, { merge: true }).catch(e => console.error("Client auto-enroll sync failed", e));
                  }
                  
                  setUser(prev => {
                    if (!prev) return null;
                    const newRole = 'Client';
                    const newEmail = user.email || clientData.email;
                    const newNexusId = clientData.id || clientSnap.docs[0].id;
                    
                    if (prev.role === newRole && prev.email === newEmail && prev.nexusId === newNexusId) {
                      return prev;
                    }
                    
                    return { 
                      ...prev, 
                      role: newRole,
                      email: newEmail,
                      nexusId: newNexusId
                    };
                  });
                  setIsBlocked(false);
               } else {
                 if ((currentCompany.memberEmails || []).includes(cleanEmail)) {
                   try {
                     const newId = `${currentCompany.id}_${cleanEmail}`;
                     await setDoc(doc(db, 'personnel', newId), {
                       companyId: currentCompany.id,
                       uid: user.uid,
                       email: cleanEmail,
                       name: user.displayName || cleanEmail.split('@')[0],
                       role: 'Personnel',
                       status: 'active',
                       joinMethod: 'auto_sync',
                       createdAt: serverTimestamp(),
                       updatedAt: serverTimestamp()
                     });
                     // The personnel snapshot will trigger and update the role
                   } catch (err) {
                     console.error("Auto personnel recovery failed:", err);
                     setIsBlocked(true);
                   }
                 } else {
                   setIsBlocked(true); // Treat as unauthorized
                 }
               }
             }, (err) => {
               console.error("Client role sub error:", err);
             });
          }
        }, (err) => {
          console.error("Personnel role sub error:", err);
        });
      }
    }

    return () => {
      if (unsubscribeRole) unsubscribeRole();
      if (unsubscribeClientRole) unsubscribeClientRole();
    };
  }, [user?.uid, currentCompany?.id, currentCompany?.ownerEmail, currentCompany?.ownerId, currentCompany?.memberEmails]);

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
        setUser(prev => {
          // Merge to preserve role, nexusId, etc.
          if (prev) {
            return {
              ...u,
              role: prev.role,
              customPermissions: prev.customPermissions,
              nexusId: prev.nexusId
            };
          }
          return u;
        });
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

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
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

  if (!user) {
    return (
      <AnimatePresence mode="wait">
        {!showLogin ? (
          <motion.div 
            key="marketplace"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen bg-slate-50 font-sans"
          >
            <div className="bg-white border-b border-slate-100 p-4 sticky top-0 z-[100] shadow-sm">
              <div className="max-w-7xl mx-auto flex justify-between items-center">
                 <div className="flex items-center gap-3 cursor-pointer">
                    <NexusLogo className="w-8 h-8 text-blue-600" />
                    <span className="font-black text-slate-800 tracking-tighter">NEXUS MARKETPLACE</span>
                 </div>
                 <div className="flex items-center gap-4">
                   <button 
                     onClick={() => setShowLogin(true)}
                     className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all font-sans shadow-lg hover:shadow-blue-600/20"
                   >
                     Se connecter
                   </button>
                 </div>
              </div>
            </div>
            <Marketplace />
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
          >
            <LoginScreen onMarketplace={() => setShowLogin(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (!currentCompany) {
    return <WorkspaceSelector companies={companies} user={user} onSelect={setCurrentCompany} onMarketplace={() => setShowMarketplace(true)} onLogout={() => auth.signOut()} />;
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
          width: isSidebarOpen ? (windowWidth < 640 ? windowWidth : 280) : (windowWidth < 1024 ? 0 : 88),
          transform: (windowWidth < 1024 && !isSidebarOpen) ? 'translateX(-280px)' : 'translateX(0)'
        }}
        className={cn(
          "bg-white border-r border-slate-100 flex flex-col z-40 shrink-0 transition-all duration-300 shadow-xl shadow-slate-200/40 overflow-hidden",
          windowWidth < 1024 
            ? "fixed left-0 top-0 h-screen" 
            : "h-[calc(100vh-2rem)] my-4 ml-4 rounded-[2rem] sticky top-4",
          isSidebarOpen && windowWidth < 1024 && "rounded-r-[2rem]"
        )}
      >
        <div className="p-6 h-28 flex items-center justify-between border-b border-slate-50 bg-white relative z-10">
          <div className="flex items-center gap-4 w-full">
            <div 
              className="shrink-0 flex items-center justify-center p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-lg shadow-indigo-200"
            >
              <NexusLogo className="w-8 h-8 filter brightness-200" />
            </div>
            
            {isSidebarOpen && (
              <div 
                className="overflow-hidden flex-1"
              >
                {activeTab === 'admin' ? (
                  <div className="font-black text-indigo-600 text-xl tracking-tighter leading-none italic">
                    NEXUS <span className="text-slate-900 not-italic">CORE</span>
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
                        className="font-black text-lg tracking-tight bg-transparent text-slate-900 border-none p-0 focus:ring-0 cursor-pointer w-full leading-none appearance-none pr-6 truncate"
                      >
                        {companies.map(c => (
                          <option key={c.id} value={c.id} className="bg-white text-slate-900 font-sans">{c.name}</option>
                        ))}
                      </select>
                      <ChevronRight size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 group-hover/select:text-slate-600 transition-colors rotate-90" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">{currentCompany.joinCode}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)} 
            className="p-2.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all rounded-xl ml-2 border border-transparent hover:border-slate-100 active:scale-95 bg-white"
          >
            {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto scrollbar-hide relative z-10">
          <div className="space-y-1">
            {navItems.map((item, i) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (windowWidth < 1024) setSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group relative overflow-hidden",
                  activeTab === item.id 
                    ? "bg-indigo-50 text-indigo-600 font-bold" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div className={cn(
                  "transition-all duration-300",
                  activeTab === item.id ? "text-indigo-600 scale-110" : "text-slate-400 group-hover:text-slate-600"
                )}>
                  <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                </div>
                {isSidebarOpen && (
                  <span className={cn(
                    "text-xs font-black uppercase tracking-widest shrink-0 transition-colors",
                    activeTab === item.id ? "text-indigo-600" : "text-slate-500 group-hover:text-slate-900"
                  )}>{item.label}</span>
                )}
              </button>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-50 flex gap-2 justify-center bg-white relative z-10">
          {user?.role === 'Client' && isSidebarOpen && (
            <div className="mb-2 w-full p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 italic">NEXUS CONNECT</p>
              <p className="text-[10px] text-slate-500 leading-tight">Votre support prioritaire est actif.</p>
              <button 
                onClick={() => setActiveTab('ecommerce')}
                className="mt-3 w-full py-2 bg-indigo-600 text-white text-[9px] font-black uppercase rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Ouvrir Support
              </button>
            </div>
          )}
          
          <button 
            onClick={() => setCurrentCompany(null)}
            className="flex-1 flex justify-center items-center p-3 rounded-xl bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-slate-100"
            title="Changer d'Espace"
          >
            <Database size={18} />
          </button>
          
          <button 
            onClick={() => authService.logout().then(() => window.location.reload())}
            className="flex-1 flex justify-center items-center p-3 rounded-xl bg-red-50 text-red-500 hover:text-red-700 hover:bg-red-100 transition-all border border-red-100"
            title="Fin de Session"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col h-screen bg-slate-50">
        {/* Top Header */}
        <header className="h-24 px-6 sm:px-12 border-b border-slate-100 bg-white sticky top-0 z-20 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4 sm:gap-6">
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)} 
              className="lg:hidden p-3 bg-blue-600 text-white rounded-2xl shadow-sm flex items-center justify-center shrink-0 active:scale-95 transition-transform"
            >
              <Menu size={20} />
            </button>
            
            {activeTab !== 'dashboard' && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className="hidden sm:flex items-center justify-center w-10 h-10 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
                title="Retour au Tableau de bord"
              >
                <ChevronLeft size={18} />
              </button>
            )}

            <div className="flex flex-col">
              <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Nexus Cockpit</h2>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none flex items-center gap-2">
                {activeTab === 'admin' ? "Console Maître" : navItems.find(n => n.id === activeTab)?.label}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div 
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden lg:flex items-center px-4 py-2 bg-slate-50 rounded-2xl border border-slate-200 group transition-all cursor-pointer hover:border-blue-300"
            >
              <Search className="text-slate-400 group-hover:text-blue-600 transition-colors" size={18} />
              <div className="text-[11px] font-bold text-slate-500 w-48 ml-3 flex justify-between items-center">
                <span>Scanner l'écosystème...</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-white rounded shadow-sm border border-slate-200">⌘K</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 lg:border-l border-slate-100 lg:pl-8">
              <ThemeToggle />
              <NotificationBell user={user} />
              
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="hidden xs:flex flex-col items-end">
                  <span className="text-[9px] sm:text-[10px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[80px] sm:max-w-none">
                    {user?.displayName || user?.email?.split('@')[0] || 'Utilisateur'}
                  </span>
                  <span className="text-[7px] sm:text-[8px] font-black text-blue-600 uppercase tracking-widest px-1.5 sm:px-2 py-0.5 bg-blue-50 rounded-full border border-blue-100 mt-0.5">
                    {user?.role}
                  </span>
                </div>
                <div className="relative group cursor-pointer">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="User" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-[1.25rem] border-2 border-slate-100 shadow-sm object-cover" />
                  ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-[1.25rem] border-2 border-slate-100 shadow-sm bg-slate-50 flex items-center justify-center text-slate-500 font-black text-base sm:text-lg">
                      {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[3px] border-white shadow-sm" />
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
        <footer className="mt-auto px-4 sm:px-8 py-6 border-t border-slate-200 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nexus Cockpit v5.0 Master</p>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span className="text-[10px] font-bold text-slate-700 uppercase">
                {isOnline ? 'Sync Interactive Active' : 'Mode Hors Connexion - Sync en attente'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-[10px] font-bold text-slate-500 hover:text-slate-900 uppercase transition-colors">Support Principal</button>
            <span className="text-slate-200">|</span>
            <button className="text-[10px] font-bold text-slate-500 hover:text-slate-900 uppercase transition-colors">Protocole Sécurité</button>
          </div>
        </footer>
      </main>
    </div>
  );
}
