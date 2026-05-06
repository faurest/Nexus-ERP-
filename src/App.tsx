import React, { useState, useEffect } from 'react';
import { auth, loginWithEmail, signupWithEmail, loginWithGoogle, logout, db, onAuthStateChanged, addDoc, collection, query, where, getDocs, doc, updateDoc, arrayUnion } from './lib/firebase';
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
  Calculator,
  Layers,
  FileText,
  Database
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
import CollaborationModule from './components/CollaborationModule';
import NotificationBell from './components/NotificationBell';

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
  'owner': ['dashboard', 'sales', 'clients', 'personnel', 'resources', 'projects', 'accounting', 'collaboration'],
  'Directeur': ['dashboard', 'sales', 'clients', 'personnel', 'resources', 'projects', 'accounting', 'collaboration'],
  'Secrétaire': ['dashboard', 'clients', 'personnel', 'resources', 'projects', 'collaboration'],
  'Comptable': ['dashboard', 'sales', 'projects', 'accounting', 'collaboration'],
  'Agent Commercial': ['dashboard', 'sales', 'clients', 'projects', 'collaboration'],
  'Vendeur de bière': ['dashboard', 'sales', 'resources', 'collaboration'],
  'Vendeur de nourriture': ['dashboard', 'sales', 'resources', 'collaboration'],
  'Collaborateur': ['dashboard', 'projects', 'resources', 'clients', 'sales', 'collaboration'],
  'Personnel': ['dashboard', 'projects', 'resources', 'clients', 'collaboration'],
};

function WorkspaceSelector({ companies, user, onSelect }: { companies: any[], user: User, onSelect: any }) {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creatingLocally, setCreatingLocally] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [connStatus, setConnStatus] = useState<'testing' | 'ok' | 'fail'>('testing');

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
      const docRef = await addDoc(collection(db, 'companies'), {
        name: newCompanyName,
        ownerId: user.uid,
        ownerEmail: user.email,
        memberEmails: [user.email],
        employees: [user.uid],
        joinCode: generatedJoinCode
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
        
        const companyEmployees = Array.isArray(company.employees) ? company.employees : [];
        if (!companyEmployees.includes(user.uid)) {
          await updateDoc(doc(db, 'companies', company.id), {
            employees: arrayUnion(user.uid),
            memberEmails: arrayUnion(user.email.trim().toLowerCase())
          });
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

  const ownedCompanies = companies.filter(c => c.ownerId === user?.uid || c.ownerEmail === user?.email);
  const joinedCompanies = companies.filter(c => c.ownerId !== user?.uid && c.ownerEmail !== user?.email);
  const isMaster = user.email === 'hackeurfaurest@gmail.com' || user.email === 'dangafelicite@gmail.com';
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);

  useEffect(() => {
    const checkWhitelist = async () => {
      if (!user?.email) return;
      
      const cleanEmail = user.email.trim().toLowerCase();

      // 1. Check if Master
      if (isMaster) {
        setIsWhitelisted(true);
        return;
      }

      // 2. Already in companies (owner or joined)
      if (companies.length > 0) {
        setIsWhitelisted(true);
        return;
      }

      try {
        console.log("Nexus Security: Vérification des accès pour", cleanEmail);
        
        // 3. Check if they ARE an owner of a company not yet loaded
        const companyQ = query(collection(db, 'companies'), where('ownerEmail', '==', cleanEmail));
        const companySnap = await getDocs(companyQ);
        if (!companySnap.empty) {
          console.log("Nexus Security: Accès autorisé (Propriétaire détecté)");
          
          // Auto-sync owner UID if missing
          for (const docSnap of companySnap.docs) {
            const data = docSnap.data();
            if (data.ownerId !== user.uid) {
              await updateDoc(doc(db, 'companies', docSnap.id), {
                ownerId: user.uid,
                employees: arrayUnion(user.uid),
                memberEmails: arrayUnion(cleanEmail)
              });
            }
          }
          
          setIsWhitelisted(true);
          return;
        }

        // 4. Search if the user's email exists in ANY personnel collection
        const q = query(collection(db, 'personnel'), where('email', '==', cleanEmail));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          console.log("Nexus Security: Accès autorisé via Personnel list. Auto-synchronisation des membres...");
          
          // Auto-enroll user into the companies they belong to in the personnel records
          for (const docSnap of snap.docs) {
            const personnelData = docSnap.data();
            const companyId = personnelData.companyId;
            if (companyId) {
              // Add them to the company's member list if not already there
              await updateDoc(doc(db, 'companies', companyId), {
                memberEmails: arrayUnion(cleanEmail),
                employees: arrayUnion(user.uid)
              }).catch(e => console.error("Auto-enroll failed for company", companyId, e));
            }
          }
          
          setIsWhitelisted(true);
          return;
        }

        console.log("Nexus Security: Résultat personnel = Aucun accès trouvé.");
        setIsWhitelisted(false);
      } catch (err) {
        console.error("Whitelist check failed:", err);
        setIsWhitelisted(false);
      }
    };
    checkWhitelist();
  }, [user?.email, companies.length, isMaster]);

  if (isWhitelisted === false && !isMaster) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl border border-red-100"
        >
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 mx-auto">
            <Shield size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Accès Restreint</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Votre adresse <span className="font-bold text-slate-700">{user.email}</span> n'est pas encore autorisée à accéder à l'écosystème Nexus.
            <br /><br />
            <span className="text-[10px] bg-amber-50 text-amber-700 p-2 rounded-lg border border-amber-100 inline-block">
              💡 CONSEIL : Si vous devriez avoir accès, demandez à votre administrateur de vérifier l'orthographe de votre email dans la liste du personnel (attention aux majuscules/minuscules).
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
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Nexus Verification Service</p>
          </div>
        </motion.div>
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

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-slate-900 font-sans relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.05),transparent),radial-gradient(circle_at_bottom_left,rgba(147,51,234,0.05),transparent)]" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl shadow-slate-200 border border-slate-100"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30 text-white">
            <Building2 size={32} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Bonjour, {user.displayName || user.email?.split('@')[0]}</h2>
          <p className="text-sm text-slate-500 mt-2">Prêt à piloter vos écosystèmes ?</p>
          
          <div className="mt-4 flex justify-center">
            {connStatus === 'testing' && (
              <span className="px-3 py-1 bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse">Vérification Connexion...</span>
            )}
            {connStatus === 'ok' && (
              <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 border border-green-100">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Firebase Connecté (europe-west2)
              </span>
            )}
            {connStatus === 'fail' && (
              <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 border border-red-100">
                <AlertCircle size={10} />
                Mode Dégradé (Firebase Offline)
              </span>
            )}
          </div>
          
          {isMaster && (
            <div className="mt-6 p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-3">Privilèges Maître Détectés</p>
              <button 
                onClick={() => onSelect({ id: 'comp_nexus_master', name: 'Nexus Enterprise Global', ownerId: 'master_nexus_01', joinCode: 'NEXUS-ADMIN' })}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-white hover:text-blue-600 transition-all group"
              >
                <Shield size={18} className="group-hover:rotate-12 transition-transform" />
                Accéder à la Console Globale
              </button>
              <p className="text-[8px] text-slate-500 mt-3 italic leading-relaxed px-2">
                Permet de superviser toutes les entreprises, migrer les données et gérer les comptes utilisateurs.
              </p>
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
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">Entreprises Créées (Vos propriétés)</h3>
                  {ownedCompanies.map(c => (
                    <button
                      key={c.id}
                      onClick={() => onSelect(c)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl border border-blue-200 bg-blue-50/30 hover:border-blue-400 hover:bg-blue-50 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 bg-blue-100 rounded-bl-full -mr-8 -mt-8 opacity-50 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center font-bold text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <span className="block font-bold text-slate-700 group-hover:text-blue-900">{c.name}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-400">Code: {c.joinCode} • {c.employees?.length || 1} Mbrs</span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors relative z-10" />
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
                      className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-700 group-hover:text-slate-900">{c.name}</span>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-purple-500 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setMode('join'); setErrorMsg(''); }}
                className="w-full flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-600 font-bold transition-all"
              >
                <Users size={20} className="text-blue-500" />
                <span className="text-xs tracking-wider uppercase">Rejoindre</span>
              </button>
              <button
                onClick={() => { setMode('create'); setErrorMsg(''); }}
                className="w-full flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-600 font-bold transition-all"
              >
                <Plus size={20} className="text-blue-500" />
                <span className="text-xs tracking-wider uppercase">Créer</span>
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
      </motion.div>
    </div>
  );
}

function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connStatus, setConnStatus] = useState<'testing' | 'ok' | 'fail'>('testing');

  useEffect(() => {
    import('./lib/firebase').then(({ testFirestoreConnection }) => {
      testFirestoreConnection().then(ok => setConnStatus(ok ? 'ok' : 'fail'));
    });
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setResetSent(false);
    setLoading(true);
    
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setAuthError('Veuillez remplir tous les champs.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        const { loginWithEmail } = await import('./lib/firebase');
        await loginWithEmail(cleanEmail, cleanPassword);
      } else {
        const { signupWithEmail } = await import('./lib/firebase');
        await signupWithEmail(cleanEmail, cleanPassword);
      }
    } catch (err: any) {
      console.error("Auth process error:", err);
      let errorMessage = 'Une erreur est survenue.';
      const code = err.code || '';
      
      switch (code) {
        case 'auth/invalid-credential':
          errorMessage = mode === 'login' 
            ? 'Identifiants incorrects. Verifiez votre email et mot de passe. IMPORTANT : Si vous avez l\'habitude de vous connecter avec Google, vous n\'avez peut-être pas de mot de passe Nexus. Utilisez alors le bouton Google ci-dessous ou "Mot de passe oublié".'
            : 'Échec de la création du compte. Cet email est peut-être déjà utilisé ou mal formé.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Aucun compte trouvé avec cet email. Veuillez d\'abord vous inscrire.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Le mot de passe ne correspond pas à cet email.';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'Cet email est déjà lié à un compte Nexus. Connectez-vous ou utilisez "Mot de passe oublié".';
          break;
        case 'auth/weak-password':
          errorMessage = 'Le mot de passe doit faire au moins 6 caractères.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Format d\'email invalide.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'La connexion par email est désactivée dans la console Firebase.';
          break;
        default:
          errorMessage = err.message || 'Erreur d\'authentification.';
      }
      setAuthError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setAuthError('Veuillez saisir votre email pour réinitialiser votre mot de passe.');
      return;
    }
    setLoading(true);
    setAuthError('');
    try {
      const { resetPassword } = await import('./lib/firebase');
      await resetPassword(email);
      setResetSent(true);
    } catch (err: any) {
      setAuthError('Impossible d\'envoyer l\'email de réinitialisation. Vérifiez l\'adresse.');
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-slate-900 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl shadow-slate-200 border border-slate-100"
      >
        <div className="flex flex-col items-center gap-4 mb-8 justify-center">
          <NexusLogo className="w-20 h-20 drop-shadow-2xl" />
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-br from-blue-900 to-blue-600 bg-clip-text text-transparent">NexusERP</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-2">Enterprise Management</p>
          </div>
          
          <div className="mt-2 flex justify-center">
            {connStatus === 'testing' && (
              <span className="px-3 py-1 bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse">Vérification...</span>
            )}
            {connStatus === 'ok' && (
              <span className="px-3 py-1 bg-green-50 text-green-600 text-[9px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 border border-green-100">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Firebase Connecté
              </span>
            )}
            {connStatus === 'fail' && (
              <span className="px-3 py-1 bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 border border-red-100">
                <AlertCircle size={10} />
                Firestore Hors-ligne
              </span>
            )}
          </div>
        </div>

        <div className="flex bg-slate-50 p-1 rounded-2xl mb-8">
          <button 
            onClick={() => { setMode('login'); setAuthError(''); }}
            className={cn(
              "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              mode === 'login' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Se Connecter
          </button>
          <button 
            onClick={() => { setMode('signup'); setAuthError(''); }}
            className={cn(
              "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              mode === 'signup' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            S'Inscrire
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {authError && (
            <div className="p-4 bg-red-50 text-red-700 text-[11px] font-bold rounded-2xl border border-red-100 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span className="leading-tight">{authError}</span>
              </div>
              {mode === 'login' && (
                <div className="mt-1 pt-2 border-t border-red-100 text-[10px] opacity-80 uppercase tracking-wide flex flex-col gap-1">
                  <span>💡 Note : Si c'est votre première connexion, utilisez l'onglet "S'Inscrire".</span>
                  <span>🔒 Sécurité : Un compte Google est distinct d'un compte Email/Pass.</span>
                </div>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email Nexus</label>
            <input 
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              placeholder="votre@nexus.com"
              required
            />
          </div>
          <div className="space-y-1.5 relative">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Mot de passe</label>
              {mode === 'login' && (
                <button 
                  type="button" 
                  onClick={handleResetPassword}
                  className="text-[9px] font-bold text-blue-600 hover:underline uppercase tracking-wider"
                >
                  Mot de passe oublié ?
                </button>
              )}
            </div>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                placeholder="••••••••"
                required={mode !== 'login' || !resetSent}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                title={showPassword ? "Masquer" : "Afficher"}
              >
                {showPassword ? <X size={16} /> : <Search size={16} className="rotate-45" />}
              </button>
            </div>
          </div>
          {resetSent && (
            <div className="p-3 bg-green-50 text-green-700 text-[10px] font-bold rounded-xl border border-green-100 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Email de réinitialisation envoyé ! Vérifiez vos courriers indésirables.
            </div>
          )}
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            {loading 
              ? (mode === 'login' ? 'Connexion...' : 'Création...') 
              : (mode === 'login' ? 'Se Connecter' : 'Commencer')}
            {!loading && <ChevronRight size={16} />}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative flex items-center py-2 mb-6">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">Méthode Alternative</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuer avec Google
          </button>
          
          <div className="mt-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
            <p className="text-[9px] text-blue-600 font-bold leading-tight">
              ⚠️ NOTE SÉCURITÉ : La connexion Google et l'inscription par Email créent des comptes distincts. 
              Si vous utilisez les deux, assurez-vous que votre email est autorisé dans votre entreprise.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center pt-6 border-t border-slate-50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {mode === 'login' ? 'NexusERP Industrial System' : 'Nexus Ecosystem Registration'}
          </p>
          <p className="text-[9px] text-slate-300 mt-1 uppercase font-mono tracking-tighter">
            {mode === 'login' ? 'Accès restreint au personnel autorisé' : 'Créez votre profil pour rejoindre une entreprise'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isBlocked, setIsBlocked] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const { currentCompany, companies, setCurrentCompany, loading: companyLoading } = useCompany();

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
            const q = query(
              collection(db, 'personnel'), 
              where('companyId', '==', currentCompany.id),
              where('email', '==', user.email)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
              const memberData = snap.docs[0].data();
              if (memberData.status === 'blocked') {
                setIsBlocked(true);
              } else {
                setUser(prev => prev ? { ...prev, role: memberData.role || 'Personnel' } : null);
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
        // Whitelist check: only allow if user has a company OR is in a personnel list OR is master
        // This prevents "Google login bypass" for unknowns.
        setUser(u);
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
        setActiveTab('dashboard');
      }
    }
  }, [user, currentCompany, activeTab]);

  if (loading || (user && companyLoading)) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-blue-600 rounded-xl mb-4 shadow-lg shadow-blue-600/20" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (!currentCompany) {
    return <WorkspaceSelector companies={companies} user={user} onSelect={setCurrentCompany} />;
  }

  if (isBlocked) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Compte Bloqué</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-8">
          Votre accès à l'espace de travail "{currentCompany.name}" a été suspendu par l'administrateur. Veuillez contacter votre responsable ou le service des ressources humaines.
        </p>
        <button 
          onClick={() => {
            setCurrentCompany(null);
            setIsBlocked(false);
          }}
          className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-colors"
        >
          Retour aux espaces de travail
        </button>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'services', label: 'Services & Prestations', icon: Layers },
    { id: 'sales', label: 'Ventes & Facturation', icon: TrendingUp },
    { id: 'clients', label: 'Partenaires Clients', icon: Users },
    { id: 'personnel', label: 'Ressources Humaines', icon: Briefcase },
    { id: 'resources', label: 'Stocks & Logistique', icon: Package },
    { id: 'projects', label: 'Projets & Tâches', icon: FolderKanban },
    { id: 'collaboration', label: 'Collaboration', icon: Handshake },
    { id: 'accounting', label: 'Rapport Comptable', icon: Calculator },
    ...(user.email === 'hackeurfaurest@gmail.com' || user.email === 'dangafelicite@gmail.com' ? [{ id: 'admin', label: 'Administration', icon: Shield }] : []),
  ].filter(item => {
    if (item.id === 'admin') return true;
    const allowed = (currentCompany.roles || DEFAULT_ROLES)[user.role] || ['dashboard'];
    return allowed.includes(item.id);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white flex overflow-hidden">
      {/* Sidebar - Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 280 : (windowWidth < 768 ? 0 : 88),
          x: (windowWidth < 768 && !isSidebarOpen) ? -280 : 0
        }}
        className={cn(
          "h-screen bg-white border-r border-slate-200 flex flex-col z-40 relative shrink-0 transition-all",
          windowWidth < 768 && "fixed left-0 top-0 shadow-2xl"
        )}
      >
        <div className="p-6 h-20 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3 w-full">
            <div className="shrink-0 flex items-center justify-center">
              <NexusLogo className="w-10 h-10 drop-shadow-md" />
            </div>
            
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden flex-1"
                >
                  {activeTab === 'admin' ? (
                    <div className="font-black text-blue-600 text-lg leading-none tracking-tighter">
                      NEXUS MASTER
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Console Globale</div>
                    </div>
                  ) : (
                    <>
                      <select 
                        value={currentCompany.id}
                        onChange={(e) => {
                          const c = companies.find(c => c.id === e.target.value);
                          if (c) setCurrentCompany(c);
                        }}
                        className="font-bold text-lg tracking-tight bg-transparent outline-none cursor-pointer truncate w-full text-slate-900"
                      >
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      {currentCompany.joinCode && (
                        <div className="text-[10px] text-slate-400 font-medium tracking-wide">
                          Code: <span className="font-mono font-bold text-slate-600">{currentCompany.joinCode}</span>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)} 
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all rounded-xl absolute right-4"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group relative",
                activeTab === item.id 
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" 
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <item.icon size={20} className={activeTab === item.id ? "text-blue-400" : "group-hover:text-slate-900"} />
              {isSidebarOpen && <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>}
              {!isSidebarOpen && activeTab === item.id && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-l-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
          <a
            href="/brochure.html"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all group outline-none"
          >
            <FileText size={20} className="group-hover:scale-110 transition-transform" />
            {isSidebarOpen && <span className="text-xs font-bold uppercase tracking-wider text-inherit">Brochure Commerciale</span>}
          </a>

          {deferredPrompt && (
            <button 
              onClick={handleInstallClick}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-green-50 text-green-600 hover:bg-green-100 transition-all group"
            >
              <DownloadCloud size={20} className="group-hover:scale-110 transition-transform" />
              {isSidebarOpen && <span className="text-xs font-bold uppercase tracking-wider text-inherit">Installer l'App</span>}
            </button>
          )}

          <button 
            onClick={() => setCurrentCompany(null)}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            {isSidebarOpen && <span className="text-xs font-bold uppercase tracking-wider text-inherit">Changer d'Espace</span>}
          </button>
          
          <button 
            onClick={logout}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all group"
          >
            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
            {isSidebarOpen && <span className="text-xs font-bold uppercase tracking-wider text-inherit">Session Close</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col h-screen">
        {/* Top Header */}
        <header className="h-20 px-4 sm:px-8 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)} 
            className="md:hidden p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-widest hidden sm:block">
              {activeTab === 'admin' ? "Console Maître Nexus" : navItems.find(n => n.id === activeTab)?.label}
            </h1>
            {activeTab === 'admin' && (
              <span className="bg-slate-900 text-blue-400 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter">
                Root Access
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter leading-none">
                {user.displayName || user.email.split('@')[0]}
              </span>
              <span className={cn(
                "text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 mt-1 rounded border",
                user.role === 'owner' ? "bg-blue-50 text-blue-600 border-blue-100" :
                user.role === 'Secrétaire' ? "bg-purple-50 text-purple-600 border-purple-100" :
                user.role === 'Comptable' ? "bg-green-50 text-green-600 border-green-100" :
                "bg-slate-50 text-slate-500 border-slate-100"
              )}>
                {user.role === 'owner' ? 'Direction Business' : user.role}
              </span>
            </div>

            <div className="relative group hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Recherche globale..." 
                className="pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-full outline-none text-xs font-medium w-64 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
              />
            </div>
            
            <div className="flex items-center gap-4 border-r border-slate-100 pr-6 mr-1 hidden lg:flex">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Base de données</span>
                <span className="text-[10px] font-bold tracking-tight text-right text-emerald-600">
                  Cloud Firebase (Live)
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border bg-emerald-50 text-emerald-500 border-emerald-100 animate-pulse">
                <Database size={18} />
              </div>
            </div>

            <NotificationBell user={user} />

            <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-900 leading-tight">{user.displayName}</p>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">
                  {user.email === 'hackeurfaurest@gmail.com' || user.email === 'dangafelicite@gmail.com' ? 'Accès Maître' : 'Accès Standard'}
                </p>
              </div>
              <div className="relative">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-2xl border-2 border-white shadow-md shadow-slate-200 object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-2xl border-2 border-white shadow-md shadow-slate-200 bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                    {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic View */}
        <div className="flex-1 p-4 sm:p-8 pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="max-w-[1400px] mx-auto"
            >
              {activeTab === 'dashboard' && <DashboardModule user={user} companies={companies} />}
              {activeTab === 'services' && <PrestationsModule />}
              {activeTab === 'sales' && <SalesModule />}
              {activeTab === 'clients' && <ClientModule />}
              {activeTab === 'personnel' && <PersonnelModule />}
              {activeTab === 'resources' && <ResourceModule />}
              {activeTab === 'projects' && <ProjectModule />}
              {activeTab === 'accounting' && <AccountingModule />}
              {activeTab === 'collaboration' && <CollaborationModule />}
              {activeTab === 'admin' && (user.email === 'hackeurfaurest@gmail.com' || user.email === 'dangafelicite@gmail.com') && <AdminModule />}
            </motion.div>
          </AnimatePresence>
        </div>

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
