import React, { useState, useEffect, Suspense } from 'react';
import { auth, loginWithGoogle, logout, db, onAuthStateChanged, addDoc, collection, query, where, getDocs, getDoc, doc, updateDoc, arrayUnion, setDoc, serverTimestamp, limit } from './lib/firebase';
type User = any;
import { syncUserProfile, type UserProfile } from './lib/userService';
import { useAuthStore } from './store/authStore';
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

// Modules (Lazy Loaded)
const DashboardModule = React.lazy(() => import('./components/DashboardModule'));
const PersonnelModule = React.lazy(() => import('./components/PersonnelModule'));
const ClientModule = React.lazy(() => import('./components/ClientModule'));
const ResourceModule = React.lazy(() => import('./components/ResourceModule'));
const ProjectModule = React.lazy(() => import('./components/ProjectModule'));
const SalesModule = React.lazy(() => import('./components/SalesModule'));
const AdminModule = React.lazy(() => import('./components/AdminModule'));
const AccountingModule = React.lazy(() => import('./components/AccountingModule'));
const PrestationsModule = React.lazy(() => import('./components/PrestationsModule'));
const EcommerceModule = React.lazy(() => import('./components/EcommerceModule'));
const CollaborationModule = React.lazy(() => import('./components/CollaborationModule'));
const GuideModule = React.lazy(() => import('./components/GuideModule'));
const MarketplaceAdminModule = React.lazy(() => import('./components/MarketplaceAdminModule'));
const Marketplace = React.lazy(() => import('./components/Marketplace'));
import ContextualHelp from './components/ContextualHelp';
import NotificationBell from './components/NotificationBell';
import CriticalNotificationOverlay from './components/CriticalNotificationOverlay';
import CommandPalette from './components/CommandPalette';

import { bootstrapDemoData } from './lib/bootstrap';
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

function WorkspaceSelector({ companies, user, profile, onSelect }: { companies: any[], user: User, profile: any, onSelect: any }) {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [connStatus, setConnStatus] = useState<'testing' | 'ok' | 'fail'>('testing');
  const { currentCompany, joinCompany, createCompany, refreshCompanies, loading: companyLoading } = useCompany();
  const [lastSession, setLastSession] = useState<{ company: any, tab: string } | null>(null);

  const cleanEmail = user?.email?.trim().toLowerCase().replace(/\s+/g, '') || '';
  
  useEffect(() => {
    if (errorMsg || successMsg) {
      const timer = setTimeout(() => {
        setErrorMsg('');
        setSuccessMsg('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg, successMsg]);

  const ownedCompanies = companies.filter(c => {
    const cOwnerEmail = c.ownerEmail?.trim().toLowerCase().replace(/\s+/g, '');
    return isGlobalAdmin || c.ownerId === user?.uid || (cOwnerEmail && cOwnerEmail === cleanEmail);
  });
  const joinedCompanies = companies.filter(c => {
    const cOwnerEmail = c.ownerEmail?.trim().toLowerCase().replace(/\s+/g, '');
    return c.ownerId !== user?.uid && cOwnerEmail !== cleanEmail;
  });

  useEffect(() => {
    import('./lib/firebase').then(({ testFirestoreConnection }) => {
      testFirestoreConnection().then(ok => setConnStatus(ok ? 'ok' : 'fail'));
    });
    
    // Load last session
    const lastCompId = localStorage.getItem('nexus_last_company_id');
    const lastTab = localStorage.getItem('nexus_last_tab') || 'dashboard';
    
    if (lastCompId && companies.length > 0) {
      const comp = companies.find(c => c.id === lastCompId);
      if (comp) {
        setLastSession({ company: comp, tab: lastTab });
      }
    }
  }, [companies]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!newCompanyName.trim()) return;

    setSubmitting(true);
    try {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let generatedJoinCode = '';
      for (let i = 0; i < 6; i++) {
        generatedJoinCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const result = await createCompany(newCompanyName, generatedJoinCode);
      if (result.success && result.id) {
        onSelect({ id: result.id, name: newCompanyName, ownerId: user.uid, joinCode: generatedJoinCode });
      } else {
        throw new Error("Erreur lors de la création de l'entreprise");
      }
    } catch(err: any) {
      console.error("Create Company Error:", err);
      setErrorMsg(`Erreur : ${err.message || 'Problème de connexion'}`);
      setSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!joinCodeInput.trim()) return;
    
    setSubmitting(true);
    const result = await joinCompany(joinCodeInput);
    setSubmitting(false);

    if (result.success) {
      setSuccessMsg(result.message);
      setTimeout(() => {
        setMode('select');
        setSuccessMsg('');
        setJoinCodeInput('');
      }, 2000);
    } else {
      setErrorMsg(result.message);
    }
  };

  const allWorkspaces = companies;

  // AUTO-SELECTION ENGINE (Critical for multi-tenant flow)
  useEffect(() => {
    // 1. Skip if already selected or still loading
    if (companyLoading || !user || !companies.length || currentCompany) return; 
    
    const savedId = localStorage.getItem('nexus_company_id') || localStorage.getItem('nexus_last_company_id');
    const isNavigating = localStorage.getItem('nexus_navigate_to');
    
    // 2. Case: Single company -> Auto-Select
    if (companies.length === 1 && !isNavigating) {
      console.log("Nexus Hub: Auto-routing single tenant configuration.");
      onSelect(companies[0]);
      return;
    }

    // 2.1 Fallback: If navigating is false and we have NO savedId but multiple companies, do NOT auto-select, allow selection.
    // If NO savedId but exactly 1 company, we auto-select. Wait, if companies.length > 0 and no savedId, we can just leave it to select mode.
    
    // 3. Case: Restore last session
    if (savedId && !isNavigating) {
      const found = companies.find(c => c.id === savedId);
      if (found) {
        console.log("Nexus Hub: Restoring session to", found.name);
        onSelect(found);
      } else if (companies.length > 0) {
        // Fallback if saved company no longer accessible: pick first available
        onSelect(companies[0]);
      }
    }
  }, [companies, companyLoading, user, currentCompany]);

  return (
    <div className="min-h-screen w-screen flex bg-[#020617] text-white font-sans overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-80 flex-col border-r border-white/5 bg-slate-950/40 p-8 backdrop-blur-3xl relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-48 -right-12 w-40 h-40 bg-indigo-600/10 rounded-full blur-[80px]" />
        </div>
        
        <div className="relative z-10 flex flex-col h-full">
           <div className="flex items-center gap-3 mb-12">
              <NexusLogo className="w-10 h-10" />
              <div className="flex flex-col">
                <span className="font-black text-xl tracking-tighter leading-none italic text-white uppercase">NEXUS <span className="text-blue-500 not-italic">HUB</span></span>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Enterprise Unified Launcher</span>
              </div>
           </div>

           <div className="space-y-6 flex-1">
              <div className="space-y-2">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Commandes Globales</h3>
                 <button 
                  onClick={() => setMode('select')}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest",
                    mode === 'select' ? "bg-white/10 text-white border border-white/10" : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                 >
                    <Layers size={16} />
                    Mes Espaces
                 </button>
                 <button 
                  onClick={() => setMode('join')}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest",
                    mode === 'join' ? "bg-white/10 text-white border border-white/10" : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                 >
                    <Users size={16} />
                    Fusionner Espace
                 </button>
                 <button 
                  onClick={() => setMode('create')}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest",
                    mode === 'create' ? "bg-white/10 text-white border border-white/10" : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                 >
                    <Plus size={16} />
                    Nouvel Espace
                 </button>
              </div>
           </div>

           <div className="pt-8 border-t border-white/5 flex flex-col gap-4">
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                 <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-white/10 flex items-center justify-center font-black text-slate-400 overflow-hidden shrink-0">
                    {user.photoURL ? <img src={user.photoURL} alt="User" /> : user.email?.charAt(0).toUpperCase()}
                 </div>
                 <div className="overflow-hidden">
                    <p className="text-[10px] font-black uppercase truncate text-white">{profile?.fullName || user.displayName || user.email?.split('@')[0] || 'Utilisateur'}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                       <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                       <p className="text-[8px] font-black text-slate-500 uppercase">Synchronisé</p>
                    </div>
                 </div>
              </div>
              <button 
                onClick={() => logout()}
                className="w-full py-4 text-[9px] font-black text-slate-500 hover:text-red-400 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <LogOut size={12} />
                Quitter Session
              </button>
           </div>
        </div>
      </aside>

      {/* Main Launcher Content */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-12 relative flex flex-col">
         {/* Background Glows */}
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
         
         <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col relative z-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
               <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                     <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                     <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Connecté en tant que {user.email}</span>
                  </div>
                  <h1 className="text-5xl lg:text-7xl font-black tracking-tighter italic text-white leading-none">NEXUS <span className="text-blue-600 not-italic">HUB</span></h1>
                  <p className="text-slate-400 font-medium text-base lg:text-lg max-w-xl">
                    Tableau de bord de lancement unifié. Accédez à vos infrastructures opérationnelles ou déployez de nouvelles strates de gestion.
                  </p>
               </div>
               
               <AnimatePresence>
                {lastSession && (
                  <motion.button
                    key="quick-resume"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => {
                      onSelect(lastSession.company);
                      localStorage.setItem('nexus_navigate_to', lastSession.tab);
                    }}
                    className="flex items-center gap-5 bg-white/5 border border-white/10 p-6 rounded-[2.5rem] hover:bg-blue-600 hover:border-transparent transition-all group shadow-2xl relative overflow-hidden active:scale-95"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20" />
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:bg-white group-hover:text-blue-600 transition-all shrink-0">
                      <TrendingUp size={28} className="animate-pulse" />
                    </div>
                    <div className="text-left pr-4">
                      <span className="block text-[10px] font-black text-blue-400 uppercase tracking-widest group-hover:text-blue-50 transition-colors">Reprendre Session Active</span>
                      <span className="block text-2xl font-black text-white italic tracking-tight">{lastSession.company.name}</span>
                    </div>
                  </motion.button>
                )}
               </AnimatePresence>
            </div>

            {/* Error/Success Feedbacks */}
            <AnimatePresence mode="wait">
              {(errorMsg || successMsg) && (
                <motion.div 
                  key="feedback"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={cn(
                    "mb-12 p-6 rounded-3xl border flex items-center gap-4 shadow-2xl backdrop-blur-md",
                    errorMsg ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-green-500/10 border-green-500/20 text-green-400"
                  )}
                >
                  <div className={cn("p-2 rounded-xl", errorMsg ? "bg-red-500/20" : "bg-green-500/20")}>
                    {errorMsg ? <ShieldAlert size={20} /> : <AlertCircle size={20} />}
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">{errorMsg || successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* View Switching */}
            <div className="flex-1">
              {mode === 'select' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {companyLoading ? (
                    [1,2,3].map(i => (
                      <div key={i} className="h-64 bg-white/5 border border-white/5 rounded-[3rem] animate-pulse" />
                    ))
                  ) : allWorkspaces.length > 0 ? (
                    allWorkspaces.map((c) => (
                      <motion.button
                        key={c.id}
                        whileHover={{ y: -8, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelect(c)}
                        className="group relative p-8 rounded-[3rem] border border-white/5 bg-gradient-to-br from-slate-900 to-slate-950 text-left overflow-hidden shadow-2xl transition-all hover:border-blue-500/30 ring-0 hover:ring-8 hover:ring-blue-500/5"
                      >
                         <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-[40px] -mr-16 -mt-16 group-hover:bg-blue-600/10 transition-all duration-700" />
                         
                         <div className="flex items-center justify-between mb-10 relative z-10">
                            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center font-black text-white text-3xl group-hover:bg-blue-600 group-hover:border-transparent group-hover:shadow-[0_15px_30px_rgba(37,99,235,0.3)] transition-all duration-500 rotate-6 group-hover:rotate-0">
                               {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                               <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{c.joinCode}</span>
                                </div>
                            </div>
                         </div>

                         <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                               <h3 className="text-2xl font-black text-white italic tracking-tighter group-hover:text-blue-400 transition-colors uppercase truncate">{c.name}</h3>
                               {isGlobalAdmin || c.ownerId === user.uid || (c.ownerEmail && c.ownerEmail === cleanEmail) ? (
                                 <span className="shrink-0 px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded-md text-[7px] font-black text-blue-400 uppercase tracking-widest">Master</span>
                               ) : (
                                 <span className="shrink-0 px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-md text-[7px] font-black text-emerald-400 uppercase tracking-widest">Staff</span>
                               )}
                            </div>
                            
                            <div className="inline-flex items-center gap-2 text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-8">
                               <div className="p-1 bg-slate-800 rounded-md"><Building2 size={10} /></div>
                               Nexus Enterprise Cloud
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-auto">
                               <div className="bg-white/5 p-3 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-colors">
                                  <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Privilèges</span>
                                  <span className="block text-sm font-black text-white truncate italic">
                                    {isGlobalAdmin ? 'Global Admin' : (c.company_members?.[0]?.role || (c.ownerId === user.uid ? 'Propriétaire' : 'Collaborateur'))}
                                  </span>
                               </div>
                               <div className="bg-white/5 p-3 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-colors">
                                  <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Réseau</span>
                                  <span className="block text-sm font-black text-blue-500 italic">Distant (SSL)</span>
                               </div>
                            </div>
                         </div>
                         
                         <div className="absolute bottom-8 right-8 p-3 bg-white/5 border border-white/10 rounded-full opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-500">
                            <ChevronRight size={20} className="text-blue-500" />
                         </div>
                      </motion.button>
                    ))
                  ) : (
    <div className="col-span-full py-24 px-8 text-center bg-slate-900/40 rounded-[4rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center backdrop-blur-xl relative overflow-hidden group">
                       {/* Animated background elements */}
                       <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] -mr-48 -mt-48 group-hover:bg-blue-600/20 transition-all duration-1000" />
                       <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[80px] -ml-24 -mb-24 group-hover:bg-indigo-600/20 transition-all duration-1000" />

                       <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-blue-500 shadow-2xl relative mb-10 ring-1 ring-white/10">
                          <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse" />
                          <Activity size={48} className="relative z-10" />
                       </div>
                       
                       <div className="space-y-6 relative z-10 max-w-lg mx-auto">
                          <div className="space-y-3">
                             <h3 className="text-3xl lg:text-4xl font-black text-white italic tracking-tighter uppercase leading-tight">Configuration en cours d&apos;analyse</h3>
                             <p className="text-slate-400 font-medium leading-relaxed text-base">
                                Votre compte <span className="text-blue-400 font-black uppercase text-sm">{user.email}</span> est authentifié, 
                                mais <span className="text-white">aucune entreprise active</span> n&apos;est actuellement rattachée à votre profil.
                             </p>
                          </div>
                          
                          <div className="p-5 bg-blue-500/5 border border-blue-500/20 rounded-3xl text-left space-y-4">
                             <div className="flex items-start gap-4">
                                <div className="p-2 bg-blue-500/20 rounded-xl mt-1">
                                   <ShieldAlert size={18} className="text-blue-400" />
                                </div>
                                <div className="space-y-1">
                                   <p className="text-xs font-black text-white uppercase tracking-wider">Pourquoi ce message ?</p>
                                   <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                                      Si vous êtes employé, votre administrateur doit vous ajouter dans le module **Ressources Humaines** avec votre email exact.
                                   </p>
                                </div>
                             </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-4 pt-4">
                             <button 
                               onClick={() => setMode('create')} 
                               className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white hover:text-blue-600 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                             >
                                Créer une Entreprise
                             </button>
                             <button 
                               onClick={() => setMode('join')} 
                               className="flex-1 py-5 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl active:scale-95"
                             >
                                Utiliser un code
                             </button>
                          </div>
                          
                          <div className="pt-8 flex flex-col gap-3">
                             <button 
                                onClick={async () => {
                                  setSubmitting(true);
                                  await refreshCompanies();
                                  setSubmitting(false);
                                  setSuccessMsg("Synchronisation forcée effectuée");
                                }}
                                className="w-full py-4 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white rounded-2xl transition-all border border-white/5 active:scale-95 flex items-center justify-center gap-2"
                             >
                                <Database size={14} />
                                Lancer l&apos;auto-réparation intelligente
                             </button>
                             <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                                Nexus ERP v5.0 • Récupération automatique activée
                             </p>
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              )}

              {mode === 'create' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-2xl mx-auto py-12"
                >
                  <form onSubmit={handleCreate} className="space-y-12">
                    <div className="text-center space-y-4 mb-16">
                      <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl mx-auto flex items-center justify-center shadow-2xl rotate-6"><Plus size={40} /></div>
                      <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white">Architecture Industrielle</h2>
                      <p className="text-slate-400 font-medium">Déployez une nouvelle instance Nexus sécurisée pour votre entreprise.</p>
                    </div>

                    <div className="space-y-8 bg-slate-900/50 p-12 rounded-[3.5rem] border border-white/5 backdrop-blur-xl">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-4 italic">Nom de l&apos;Entité Opérationnelle</label>
                        <input 
                          type="text" 
                          value={newCompanyName}
                          onChange={e => setNewCompanyName(e.target.value)}
                          placeholder="Ex: NEXUS LOGISTICS HUB"
                          className="w-full bg-white/5 border border-white/5 rounded-3xl p-8 outline-none focus:ring-4 focus:ring-blue-600/20 focus:border-blue-600 font-black text-2xl tracking-tight transition-all placeholder:text-slate-700 italic text-white uppercase"
                          required
                          autoFocus
                        />
                      </div>

                      <div className="flex flex-col gap-4">
                        <button type="submit" disabled={submitting || !newCompanyName.trim()} className="w-full py-6 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition-all shadow-2xl shadow-blue-600/20 active:scale-95">
                          {submitting ? 'Déploiement Nexus...' : "Initialiser l'Infrastructure"}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setMode('select')} 
                          className="w-full py-4 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                        >
                          <ChevronLeft size={16} /> Retour au Terminal
                        </button>
                      </div>
                    </div>
                  </form>
                </motion.div>
              )}

              {mode === 'join' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-2xl mx-auto py-12"
                >
                  <form onSubmit={handleJoin} className="space-y-12">
                    <div className="text-center space-y-4 mb-16">
                      <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl mx-auto flex items-center justify-center shadow-2xl -rotate-6"><Users size={40} /></div>
                      <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white">Intégration Systémique</h2>
                      <p className="text-slate-400 font-medium">Rejoignez un espace de travail existant grâce à votre protocole d'accès.</p>
                    </div>

                    <div className="space-y-8 bg-slate-900/50 p-12 rounded-[3.5rem] border border-white/5 backdrop-blur-xl">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-4 italic">Clé d&apos;Accès Nexus (6 Caractères)</label>
                        <input 
                          type="text" 
                          value={joinCodeInput}
                          onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                          placeholder="XXXXXX"
                          maxLength={6}
                          className="w-full bg-white/5 border border-white/5 rounded-3xl p-10 outline-none focus:ring-4 focus:ring-indigo-600/20 focus:border-indigo-600 font-black text-5xl text-center tracking-[0.5em] uppercase transition-all shadow-inner italic text-white"
                          required
                          autoFocus
                        />
                        <p className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-4">Demandez cette clé à votre agent d&apos;administration.</p>
                      </div>

                      <div className="flex flex-col gap-4">
                        <button type="submit" disabled={submitting || !joinCodeInput.trim()} className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/20 active:scale-95">
                          {submitting ? 'Authentification...' : 'Synchroniser mon Accès'}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setMode('select')} 
                          className="w-full py-4 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                        >
                          <ChevronLeft size={16} /> Retour au Terminal
                        </button>
                      </div>
                    </div>
                  </form>
                </motion.div>
              )}
            </div>

            {/* Global Footer Launcher */}
            <div className="mt-auto py-12 flex flex-col md:flex-row items-center justify-between gap-8 border-t border-white/5 px-4 lg:px-0">
               <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2">
                     <div className={cn("w-2 h-2 rounded-full", connStatus === 'ok' ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-amber-500 animate-pulse")} />
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{connStatus === 'ok' ? 'Cloud Infrastructure Secured' : 'Connecting to Core...'}</span>
                  </div>
                  <div className="hidden lg:flex items-center gap-2 text-slate-600">
                     <Shield size={14} />
                     <span className="text-[10px] font-bold uppercase tracking-widest">Architectural v5.0-LEGENDARY</span>
                  </div>
               </div>

               <div className="flex items-center gap-6">
                  <a href="#" className="text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest">Protocoles</a>
                  <a href="#" className="text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest">Support Global</a>
                  <button onClick={() => logout()} className="px-5 py-2.5 bg-white/5 hover:bg-red-500/10 text-[10px] font-black text-slate-400 hover:text-red-400 uppercase tracking-widest rounded-xl border border-white/5 transition-all">Déconnexion</button>
               </div>
            </div>
         </div>
      </main>
    </div>
  );
}

function LoginScreen({ onMarketplace }: { onMarketplace: () => void }) {
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connStatus, setConnStatus] = useState<'testing' | 'ok' | 'fail'>('testing');

  useEffect(() => {
    import('./lib/firebase').then(({ testFirestoreConnection }) => {
      testFirestoreConnection().then(ok => setConnStatus(ok ? 'ok' : 'fail'));
    });
  }, []);

  const handleGoogleLogin = async () => {
    setAuthError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      setAuthError('Échec de la connexion avec Google. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-slate-900 font-sans relative">
      <div className="max-w-md w-full bg-white rounded-3xl p-12 shadow-xl border border-slate-200 relative overflow-hidden">
        
        <div className="flex flex-col items-center gap-6 mb-12 justify-center">
          <div>
            <NexusLogo className="w-20 h-20" />
          </div>
          
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Nexus<span className="text-blue-600">ERP</span></h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3">Intelligence Industrielle</p>
          </div>
          
          <div className="mt-2">
            {connStatus === 'testing' && (
              <span className="px-3 py-1 bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse">Syncing...</span>
            )}
            {connStatus === 'ok' && (
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 border border-blue-100">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Secured
              </span>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {authError && (
            <div className="p-4 bg-red-50 text-red-700 text-[11px] font-bold rounded-xl border border-red-100 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span className="leading-tight">{authError}</span>
            </div>
          )}

          <div className="text-center mb-4">
            <p className="text-slate-500 text-sm font-medium">L'accès est sécurisé par authentification Google.</p>
          </div>

          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-4 shadow-lg shadow-blue-600/10 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" />
                  <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="currentColor" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" />
                </svg>
                <span>Google Nexus Access</span>
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest"><span className="bg-white px-4 text-slate-300 italic">Ou explorez</span></div>
          </div>

          <button 
            onClick={onMarketplace}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-4 shadow-xl"
          >
            <ShoppingBag size={18} />
            <span>Accéder au Marketplace</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { user: authStoreUser, profile, isGlobalAdmin, activeRole, permissions } = useAuthStore();
  const user = authStoreUser;
  
  /* removed */
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
  const { currentCompany, companies, setCurrentCompany, loading: companyLoading } = useCompany();

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
  const isMaster = cleanEmail === 'hackeurfaurest@gmail.com' || cleanEmail === 'dangafelicite@gmail.com' || cleanEmail === 'yaoubaboubakary43@gmail.com';
  
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

  const effectiveUser = React.useMemo(() => {
    if (!user) return null;
    return {
      ...user,
      role: activeRole || 'Personnel'
    };
  }, [user, activeRole]);

  useEffect(() => {
    // DIAGNOSTIC LOGS REQUIRED FOR ANALYSIS
    if (user) {
      console.log("AUTH USER:", user);
      console.log("PROFILE:", profile);
      console.log("MEMBERSHIPS:", companies);
      console.log("CURRENT COMPANY:", currentCompany);
      console.log("WORKSPACE:", currentCompany ? currentCompany.id : 'None Selected');
    }
  }, [user, profile, companies, currentCompany]);

  // Remove the old role resolution logic that mutated user object directly
  // We now rely on Zustand's authStore for roles and permissions

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
    setLoading(false); // Handled by context
    
    // Test Firestore connection on load
    import('./lib/firebase').then(({ testFirestoreConnection }) => {
      testFirestoreConnection();
    });

    
  }, []);

  useEffect(() => {
    if (activeRole && currentCompany) {
      const allowed = permissions;
      if (allowed.length > 0 && !allowed.includes('*') && !allowed.includes(activeTab) && activeTab !== 'admin') {
        setActiveTab('dashboard');
      }
    }
  }, [activeRole, permissions, currentCompany, activeTab]);

  if (loading || (user && companyLoading)) {
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
    return <WorkspaceSelector companies={companies} user={user} profile={profile} onSelect={setCurrentCompany} />;
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
    ...(user.email === 'hackeurfaurest@gmail.com' || user.email === 'dangafelicite@gmail.com' || user.email === 'yaoubaboubakary43@gmail.com' ? [{ id: 'admin', label: 'Administration', icon: Shield },
      ...(isGlobalAdmin ? [{ id: 'market_admin', label: 'Admin Marketplace', icon: Shield }] : [])] : []),
  ].filter(item => {
    if (item.id === 'admin' || item.id === 'market_admin') return isGlobalAdmin;
    if (item.id === 'dashboard') return true;
    if (permissions.includes('*')) return true;
    
    // Temporary map of legacy tab IDs to RBAC permissions
    const tabPermMap: Record<string, string> = {
        'marketplace': 'view_dashboard',
        'services': 'manage_projects',
        'sales': 'manage_sales',
        'ecommerce': 'manage_sales',
        'clients': 'manage_sales',
        'personnel': 'manage_users',
        'resources': 'manage_inventory',
        'projects': 'manage_projects',
        'collaboration': 'view_dashboard',
        'communication': 'view_dashboard',
        'accounting': 'manage_billing',
        'guide': 'view_dashboard'
    };
    const requiredPerm = tabPermMap[item.id];
    return requiredPerm ? permissions.includes(requiredPerm) : false;
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
            onClick={logout}
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
        <header className="h-16 px-4 md:px-10 border-b border-white/5 bg-[#020617]/80 sticky top-0 z-20 flex items-center justify-between backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)} 
              className="lg:hidden p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
            >
              <Menu size={18} />
            </button>
            <div className="flex flex-col">
              <h2 className="text-[8px] font-black text-blue-500/60 uppercase tracking-[0.4em] mb-0.5 leading-none">Nexus Protocol</h2>
              <h1 className="text-sm md:text-base font-black text-white tracking-tight leading-none uppercase italic">
                {activeTab === 'admin' ? "Console Maître" : navItems.find(n => n.id === activeTab)?.label}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4 md:gap-6">
            <div 
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden xl:flex items-center px-4 py-1.5 bg-white/5 rounded-xl border border-white/5 group transition-all cursor-pointer hover:border-blue-500/30"
            >
              <Search className="text-slate-500 group-hover:text-blue-500 transition-colors" size={14} />
              <div className="text-[9px] font-bold text-slate-500 w-28 ml-3 flex justify-between items-center">
                <span className="uppercase tracking-widest">Scanner</span>
                <span className="text-[7px] px-1.5 py-0.5 bg-white/5 rounded border border-white/5">⌘K</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <NotificationBell user={user} />
              
              <div className="flex items-center gap-2.5 pl-2 md:pl-4 border-l border-white/5">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[10px] font-black text-white uppercase tracking-tight truncate max-w-[100px]">
                    {profile?.fullName || 'Utilisateur Nexus'}
                  </span>
                  <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-1.5 py-0.5 rounded-md border border-blue-500/10">
                    ID: {profile?.id?.slice(0, 8)}
                  </span>
                </div>
                <div className="relative group cursor-pointer active:scale-90 transition-transform">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="User" className="w-8 h-8 md:w-9 md:h-9 rounded-xl border border-white/10 shadow-xl object-cover" />
                  ) : (
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl border border-white/10 shadow-xl bg-slate-900 flex items-center justify-center text-slate-400 font-black text-xs">
                      {user.displayName?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-950 shadow-sm" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic View */}
        {user && currentCompany && <CriticalNotificationOverlay user={user} />}
        <div className="flex-1 p-3 md:p-8 pb-32">
          <div
            className="max-w-[1400px] mx-auto"
          >
        <Suspense fallback={<div className='flex justify-center items-center h-64'><div className='animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500'></div></div>}>
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
              {activeTab === 'admin' && <AdminModule />}
              {activeTab === 'market_admin' && <MarketplaceAdminModule />}
            </Suspense>
          </div>
        </div>

        <ContextualHelp 
          isOpen={isHelpOpen} 
          onClose={() => setIsHelpOpen(false)} 
          topic={helpTopic}
        />

        {/* Global Toast System */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
            >
              <div className={cn(
                "px-8 py-4 rounded-3xl border shadow-2xl backdrop-blur-xl flex items-center gap-4",
                toast.type === 'info' ? "bg-slate-900/90 border-white/10 text-white" : "",
                toast.type === 'success' ? "bg-emerald-950/90 border-emerald-500/20 text-emerald-400" : "",
                toast.type === 'warn' ? "bg-amber-950/90 border-amber-500/20 text-amber-400" : ""
              )}>
                 <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                    <NexusLogo className="w-5 h-5" />
                 </div>
                 <span className="text-[10px] font-black uppercase tracking-[0.2em]">{toast.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Footer */}
        <footer className="mt-auto px-4 sm:px-8 py-6 border-t border-white/5 bg-nexus-surface flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6">
            <p className="text-[10px] font-bold text-nexus-text-muted uppercase tracking-widest">Nexus Cockpit v5.0-LEGENDARY</p>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-nexus-success rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-nexus-text uppercase">Sync Intelligence Active</span>
            </div>
          </div>
          <div className="flex items-center gap-4 pb-20 md:pb-0">
            <button className="text-[10px] font-bold text-nexus-text-muted hover:text-nexus-text uppercase transition-colors">Support Principal</button>
            <span className="text-white/5">|</span>
            <button className="text-[10px] font-bold text-nexus-text-muted hover:text-nexus-text uppercase transition-colors">Protocole Sécurité</button>
          </div>
        </footer>

        {/* Mobile Bottom Bar */}
        <div className="lg:hidden fixed bottom-6 left-6 right-6 h-14 bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-2xl flex items-center justify-around px-2 z-50 shadow-[0_15px_40px_rgba(0,0,0,0.4)]">
           {[
             { id: 'dashboard', icon: LayoutDashboard, label: 'Dash' },
             { id: 'sales', icon: TrendingUp, label: 'Ventes' },
             { id: 'resources', icon: Package, label: 'Stock' },
             { id: 'projects', icon: FolderKanban, label: 'Projets' },
             { id: 'marketplace', icon: Store, label: 'Nexus' }
           ].map(item => (
             <button
               key={item.id}
               onClick={() => setActiveTab(item.id)}
               className={cn(
                 "flex flex-col items-center gap-0.5 transition-all w-12 py-1 rounded-xl",
                 activeTab === item.id ? "text-blue-400 bg-white/5" : "text-slate-500"
               )}
             >
               <item.icon size={16} strokeWidth={activeTab === item.id ? 2.5 : 2} />
               <span className="text-[6px] font-black uppercase tracking-[0.2em]">{item.label}</span>
               {activeTab === item.id && (
                 <motion.div 
                   layoutId="activeTabIndicator"
                   className="w-1 h-1 bg-blue-500 rounded-full mt-0.5 shadow-[0_0_8px_#3b82f6]"
                 />
               )}
             </button>
           ))}
        </div>
      </main>
    </div>
  );
}
