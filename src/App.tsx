import React, { useState, useEffect } from 'react';
import { auth, loginWithGoogle, logout, db, onAuthStateChanged, addDoc, collection, query, where, getDocs, doc, updateDoc, arrayUnion, setDoc, serverTimestamp, limit } from './lib/firebase';
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

function WorkspaceSelector({ companies, user, onSelect }: { companies: any[], user: User, onSelect: any }) {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creatingLocally, setCreatingLocally] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [connStatus, setConnStatus] = useState<'testing' | 'ok' | 'fail'>('testing');

  const cleanEmail = user?.email?.trim().toLowerCase().replace(/\s+/g, '') || '';
  const isMaster = cleanEmail === 'hackeurfaurest@gmail.com' || cleanEmail === 'dangafelicite@gmail.com';
  
  const ownedCompanies = companies.filter(c => {
    const cOwnerEmail = c.ownerEmail?.trim().toLowerCase().replace(/\s+/g, '');
    return c.ownerId === user?.uid || (cOwnerEmail && cOwnerEmail === cleanEmail);
  });
  const joinedCompanies = companies.filter(c => {
    const cOwnerEmail = c.ownerEmail?.trim().toLowerCase().replace(/\s+/g, '');
    return c.ownerId !== user?.uid && cOwnerEmail !== cleanEmail;
  });

  useEffect(() => {
    import('./lib/firebase').then(({ testFirestoreConnection }) => {
      testFirestoreConnection().then(ok => setConnStatus(ok ? 'ok' : 'fail'));
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!newCompanyName.trim()) return;

    setCreatingLocally(true);
    try {
      const generatedJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const cleanEmail = user.email.trim().toLowerCase().replace(/\s+/g, '');
      const docRef = await addDoc(collection(db, 'companies'), {
        name: newCompanyName,
        ownerId: user.uid,
        ownerEmail: cleanEmail,
        memberEmails: [cleanEmail],
        employees: [user.uid],
        joinCode: generatedJoinCode,
        createdAt: serverTimestamp()
      });
      onSelect({ id: docRef.id, name: newCompanyName, ownerId: user.uid, joinCode: generatedJoinCode });
    } catch(err: any) {
      console.error("Create Company Error:", err);
      setErrorMsg(`Erreur : ${err.message || 'Problème de connexion'}`);
      setCreatingLocally(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!joinCode.trim()) return;
    setCreatingLocally(true);
    try {
      const codeToSearch = joinCode.trim().toUpperCase();
      const q = query(collection(db, 'companies'), where('joinCode', '==', codeToSearch));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const companyDoc = snap.docs[0];
        const company = { id: companyDoc.id, ...companyDoc.data() } as any;
        
        // Ensure user is in personnel, block if not registered
        const personnelQ = query(
          collection(db, 'personnel'), 
          where('companyId', '==', company.id)
        );
        const personnelSnap = await getDocs(personnelQ);
        const isRegistered = personnelSnap.docs.some(doc => {
           const data = doc.data();
           return data.email && data.email.trim().toLowerCase() === user.email?.trim().toLowerCase();
        });
        const isMaster = user.email === 'hackeurfaurest@gmail.com' || user.email === 'dangafelicite@gmail.com';
        if (!isRegistered && user.uid !== company.ownerId && user.email !== company.ownerEmail && !isMaster) {
           setErrorMsg('Accès refusé. Vous devez être enregistré dans le personnel de cette entreprise.');
           setCreatingLocally(false);
           return;
        }
        
        const cleanEmail = user.email.trim().toLowerCase();
        const companyEmployees = Array.isArray(company.employees) ? company.employees : [];
        if (!companyEmployees.includes(user.uid) || !(company.memberEmails || []).includes(cleanEmail)) {
          await setDoc(doc(db, 'companies', company.id), {
            employees: arrayUnion(user.uid),
            memberEmails: arrayUnion(cleanEmail),
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
        
        onSelect({ ...company, employees: [...companyEmployees, user.uid] });
      } else {
        setErrorMsg('Code d\'entreprise invalide.');
      }
    } catch(err: any) {
      console.error("Join Company Error:", err);
      setErrorMsg(`Erreur integration : ${err.message || 'Inconnue'}`);
    } finally {
      setCreatingLocally(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-slate-900 font-sans relative">
      <div className="max-w-md w-full bg-white rounded-2xl p-10 shadow-lg border border-slate-200 relative">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-6 text-white shadow-md">
            <Building2 size={32} />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-2">Choisir un Espace</h2>
          <p className="text-slate-500 text-sm font-medium">Sélectionnez ou créez votre environnement de travail NeNexus.</p>
          
          {isMaster && (
            <div className="mt-6 p-4 bg-slate-900 rounded-xl border border-slate-800">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-3">Privilèges Maître Détectés</p>
              <button 
                onClick={() => onSelect({ id: 'comp_nexus_master', name: 'Nexus Enterprise Global', ownerId: 'master_nexus_01', joinCode: 'NEXUS-ADMIN' })}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all font-mono"
              >
                <Shield size={18} />
                Accéder à la Console Globale
              </button>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            {connStatus === 'testing' && (
              <span className="px-3 py-1 bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-full">Vérification de Flux...</span>
            )}
            {connStatus === 'ok' && (
              <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 border border-green-100">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Network Online
              </span>
            )}
          </div>
          
          {isMaster && (
            <div className="mt-6 p-4 bg-slate-900 rounded-xl border border-slate-800">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-3">Privilèges Maître Détectés</p>
              <button 
                onClick={() => onSelect({ id: 'comp_nexus_master', name: 'Nexus Enterprise Global', ownerId: 'master_nexus_01', joinCode: 'NEXUS-ADMIN' })}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all font-mono"
              >
                <Shield size={18} />
                Accéder à la Console Globale
              </button>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 flex items-center gap-2">
            <AlertCircle size={16} />
            <span className="flex-1 overflow-hidden text-ellipsis">{errorMsg}</span>
          </div>
        )}

        {mode === 'select' && (
          <>
            <div className="space-y-6 mb-6">
              {ownedCompanies.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-2 flex items-center gap-2">
                    <span className="w-4 h-[1px] bg-slate-200" />
                    Propriétés Directes
                  </h3>
                  {ownedCompanies.map((c, i) => (
                    <button
                      key={c.id}
                      onClick={() => onSelect(c)}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-blue-600 hover:bg-blue-50/50 transition-all group"
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-900 text-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <span className="block font-black text-slate-800 text-sm tracking-tight group-hover:text-blue-900">{c.name}</span>
                          <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-widest">{c.joinCode}</span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ))}
                </div>
              )}

              {joinedCompanies.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">Espaces Rejoints</h3>
                  {joinedCompanies.map(c => (
                    <button
                      key={c.id}
                      onClick={() => onSelect(c)}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-700">{c.name}</span>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setMode('join'); setErrorMsg(''); }}
                className="w-full flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-600 font-bold transition-all"
              >
                <Users size={20} className="text-blue-500" />
                <span className="text-[10px] tracking-wider uppercase">Rejoindre</span>
              </button>
              <button
                onClick={() => { setMode('create'); setErrorMsg(''); }}
                className="w-full flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-600 font-bold transition-all"
              >
                <Plus size={20} className="text-blue-500" />
                <span className="text-[10px] tracking-wider uppercase">Créer</span>
              </button>
            </div>
          </>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4 cursor-default text-left">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nom de l'entreprise</label>
              <input 
                type="text" 
                value={newCompanyName}
                onChange={e => setNewCompanyName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-medium text-sm"
                placeholder="Ex: Nexus Corp"
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setMode('select')} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm tracking-wide hover:bg-slate-200 transition-colors">Retour</button>
              <button type="submit" disabled={creatingLocally || !newCompanyName.trim()} className="flex-[2] px-4 py-3 bg-blue-600 text-white shadow-lg shadow-blue-600/20 rounded-xl font-bold text-sm tracking-wide hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition-colors">
                {creatingLocally ? 'Création...' : 'Créer'}
              </button>
            </div>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4 cursor-default text-left">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Code d'intégration (Join Code)</label>
              <input 
                type="text" 
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-bold text-center tracking-widest uppercase text-sm"
                placeholder="EX: A1B2C3"
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setMode('select')} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm tracking-wide hover:bg-slate-200 transition-colors">Retour</button>
              <button type="submit" disabled={creatingLocally || !joinCode.trim()} className="flex-[2] px-4 py-3 bg-blue-600 text-white shadow-lg shadow-blue-600/20 rounded-xl font-bold text-sm tracking-wide hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition-colors">
                {creatingLocally ? 'Intégration...' : 'Rejoindre'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <button 
            onClick={() => logout()}
            className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-red-500 transition-colors flex items-center justify-center gap-2 mx-auto group"
          >
            <LogOut size={12} className="group-hover:-translate-x-0.5 transition-transform" />
            Se Déconnecter de Nexus
          </button>
        </div>
      </div>
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [helpTopic, setHelpTopic] = useState<string | undefined>(undefined);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isBlocked, setIsBlocked] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const { currentCompany, companies, setCurrentCompany, loading: companyLoading } = useCompany();

  const cleanEmail = user?.email?.trim().toLowerCase().replace(/\s+/g, '') || '';
  const isMaster = cleanEmail === 'hackeurfaurest@gmail.com' || cleanEmail === 'dangafelicite@gmail.com';
  
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
    const checkWhitelist = async () => {
      if (!user?.email || !user?.uid) return;
      
      const normalizedEmail = user.email.trim().toLowerCase().replace(/\s+/g, '');

      try {
        console.log("Nexus Security: Analyse des accès pour", normalizedEmail);
        
        // 1. First find ALL companies to check if user should be owner/member
        const [compSnap, personnelSnap, clientSnap] = await Promise.all([
          getDocs(collection(db, 'companies')),
          getDocs(collection(db, 'personnel')),
          getDocs(collection(db, 'clients'))
        ]);

        let foundAccess = false;
        
        // Check Master status
        if (isMaster) foundAccess = true;

        // Check ownership/membership by scanning instead of literal query (more resilient if DB not normalized yet)
        for (const docSnap of compSnap.docs) {
          const data = docSnap.data();
          const cOwnerEmail = data.ownerEmail?.trim().toLowerCase().replace(/\s+/g, '');
          const isMember = data.memberEmails?.some((e: string) => typeof e === 'string' && e.trim().toLowerCase().replace(/\s+/g, '') === normalizedEmail);
          
          if (cOwnerEmail === normalizedEmail || isMember) {
            foundAccess = true;
            const updates: any = {};
            if (cOwnerEmail === normalizedEmail && data.ownerId !== user.uid) updates.ownerId = user.uid;
            if (!data.employees?.includes(user.uid)) updates.employees = arrayUnion(user.uid);
            if (!data.memberEmails?.includes(normalizedEmail)) updates.memberEmails = arrayUnion(normalizedEmail);
            
            if (Object.keys(updates).length > 0) {
              updates.updatedAt = serverTimestamp();
              await updateDoc(docSnap.ref, updates).catch(e => console.warn("Owner auto-sync failed", e));
            }
          }
        }

        // Sync Personnel
        for (const docSnap of personnelSnap.docs) {
           const pData = docSnap.data();
           const pEmail = pData.email?.trim().toLowerCase().replace(/\s+/g, '');
           if (pEmail === normalizedEmail) {
             foundAccess = true;
             if (pData.uid !== user.uid || pData.status === 'invited') {
               await updateDoc(docSnap.ref, { 
                 uid: user.uid, 
                 status: 'active', 
                 updatedAt: serverTimestamp() 
               }).catch(e => console.warn("Personnel Sync failed", e));
             }
           }
        }

        // Sync Clients
        for (const docSnap of clientSnap.docs) {
           const cData = docSnap.data();
           const cEmail = cData.email?.trim().toLowerCase().replace(/\s+/g, '');
           if (cEmail === normalizedEmail) {
             foundAccess = true;
             if (cData.uid !== user.uid || cData.status === 'invited') {
               await updateDoc(docSnap.ref, { 
                 uid: user.uid, 
                 status: 'active', 
                 updatedAt: serverTimestamp() 
               }).catch(e => console.warn("Client Sync failed", e));
             }
           }
        }

        // Final decision logic
        console.log("Nexus Security: Analyse terminée. foundAccess:", foundAccess, "isMaster:", isMaster, "companies:", companies.length);
        if (isMaster || foundAccess || (companies && companies.length > 0)) {
          setIsWhitelisted(true);
        } else {
          console.log("Nexus Security: Aucun accès trouvé pour", normalizedEmail);
          setIsWhitelisted(false);
        }
      } catch (err) {
        console.error("Whitelist check failed:", err);
        setIsWhitelisted(isMaster);
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
    if (user && currentCompany && !user.role) {
      if (currentCompany.ownerEmail === user.email || currentCompany.ownerId === user.uid || user.email === 'hackeurfaurest@gmail.com' || user.email === 'dangafelicite@gmail.com') {
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
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        // Sync user profile to Firestore for notification lookups
        try {
          const rawEmail = u.email || u.providerData?.find(p => p?.email)?.email;
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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="relative">
            <NexusLogo className="w-16 h-16 animate-pulse opacity-20" />
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-600/20" />
            </div>
          </div>
          <p className="mt-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Symphonie Nexus en cours...</p>
        </div>
        
        {/* Simple timeout fallback to prevent infinite loading */}
        <div className="mt-12 text-[10px] text-slate-300 font-medium">
          Démarrage de l'écosystème sécurisé
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

  if (!user) {
    return <LoginScreen onMarketplace={() => setShowMarketplace(true)} />;
  }

  if (isWhitelisted === false && !isMaster) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-10 shadow-lg border border-red-100">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 mx-auto">
            <Shield size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Accès Restreint</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Votre adresse <span className="font-bold text-slate-700">{user.email}</span> n'est pas encore autorisée à accéder à l'écosystème Nexus.
            <br /><br />
            <span className="text-[10px] bg-amber-50 text-amber-700 p-2 rounded-lg border border-amber-100 inline-block">
              💡 CONSEIL : Si vous devriez avoir accès, demandez à votre administrateur de vérifier l'orthographe de votre email dans la liste du personnel.
            </span>
            <br /><br />
            Contactez votre administrateur pour être ajouté au personnel de votre entreprise.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => logout()}
              className="w-full py-3.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isWhitelisted === null && !isMaster && companies.length === 0) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <Shield size={48} className="text-slate-200 mb-4" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vérification des autorisations...</p>
        </div>
      </div>
    );
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
    ...(user.email === 'hackeurfaurest@gmail.com' || user.email === 'dangafelicite@gmail.com' ? [{ id: 'admin', label: 'Administration', icon: Shield }] : []),
  ].filter(item => {
    if (item.id === 'admin') return true;
    const allowedByRole = (currentCompany.roles || DEFAULT_ROLES)[user.role] || ['dashboard'];
    const customPermissions = user.customPermissions || [];
    return allowedByRole.includes(item.id) || customPermissions.includes(item.id);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white flex overflow-hidden">
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
      <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col h-screen bg-slate-50">
        {/* Top Header */}
        <header className="h-24 px-6 sm:px-12 border-b border-slate-100 bg-white sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)} 
              className="lg:hidden p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
            >
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-1">Nexus Operational</h2>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
                {activeTab === 'admin' ? "Console Maître" : navItems.find(n => n.id === activeTab)?.label}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="hidden lg:flex items-center px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 group transition-all">
              <Search className="text-slate-300 group-hover:text-blue-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Scanner l'écosystème..." 
                className="bg-transparent border-none outline-none text-[11px] font-bold text-slate-700 w-48 ml-3 placeholder:text-slate-300"
              />
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 lg:border-l border-slate-100 lg:pl-8">
              <NotificationBell user={user} />
              
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="hidden xs:flex flex-col items-end">
                  <span className="text-[9px] sm:text-[10px] font-black text-slate-900 uppercase tracking-tighter truncate max-w-[80px] sm:max-w-none">
                    {user?.displayName || user?.email?.split('@')[0] || 'Utilisateur'}
                  </span>
                  <span className="text-[7px] sm:text-[8px] font-black text-blue-500 uppercase tracking-[0.1em] px-1.5 sm:px-2 py-0.5 bg-blue-50 rounded-full border border-blue-100 mt-0.5">
                    {user?.role}
                  </span>
                </div>
                <div className="relative group cursor-pointer">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="User" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-[1.25rem] border-2 border-white shadow-xl shadow-slate-200 object-cover" />
                  ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-[1.25rem] border-2 border-white shadow-xl shadow-slate-200 bg-slate-100 flex items-center justify-center text-slate-500 font-black text-base sm:text-lg">
                      {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-[3px] border-white shadow-sm" />
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
            {activeTab === 'dashboard' && <DashboardModule user={user} companies={companies} />}
            {activeTab === 'marketplace' && <Marketplace onBack={() => setActiveTab('dashboard')} />}
            {activeTab === 'services' && <PrestationsModule />}
            {activeTab === 'sales' && <SalesModule />}
            {activeTab === 'ecommerce' && <EcommerceModule user={user} />}
            {activeTab === 'clients' && <ClientModule />}
            {activeTab === 'personnel' && <PersonnelModule user={user} />}
            {activeTab === 'resources' && <ResourceModule user={user} />}
            {activeTab === 'projects' && <ProjectModule />}
            {activeTab === 'accounting' && <AccountingModule />}
            {activeTab === 'collaboration' && <CollaborationModule />}
            {activeTab === 'guide' && <GuideModule />}
            {activeTab === 'admin' && (user.email === 'hackeurfaurest@gmail.com' || user.email === 'dangafelicite@gmail.com') && <AdminModule />}
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
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NexusERP v4.2.0-STABLE</p>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-slate-600 uppercase">Serveur France-Nord (Live)</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-[10px] font-bold text-slate-400 hover:text-slate-900 uppercase">Support</button>
            <span className="text-slate-200">|</span>
            <button className="text-[10px] font-bold text-slate-400 hover:text-slate-900 uppercase">Sécurité</button>
          </div>
        </footer>
      </main>
    </div>
  );
}
