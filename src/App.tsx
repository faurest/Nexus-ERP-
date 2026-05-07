import React, { useState, useEffect } from 'react';
import { auth, loginWithGoogle, logout, db, onAuthStateChanged, addDoc, collection, query, where, getDocs, doc, updateDoc, arrayUnion, setDoc, serverTimestamp } from './lib/firebase';
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
  Database,
  MessageSquare
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
import CommunicationModule from './components/CommunicationModule';
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
  'owner': ['dashboard', 'sales', 'clients', 'personnel', 'resources', 'projects', 'accounting', 'collaboration', 'communication'],
  'Directeur': ['dashboard', 'sales', 'clients', 'personnel', 'resources', 'projects', 'accounting', 'collaboration', 'communication'],
  'Secrétaire': ['dashboard', 'clients', 'personnel', 'resources', 'projects', 'collaboration', 'communication'],
  'Comptable': ['dashboard', 'sales', 'projects', 'accounting', 'collaboration', 'communication'],
  'Agent Commercial': ['dashboard', 'sales', 'clients', 'projects', 'collaboration', 'communication'],
  'Vendeur de bière': ['dashboard', 'sales', 'resources', 'collaboration', 'communication'],
  'Vendeur de nourriture': ['dashboard', 'sales', 'resources', 'collaboration', 'communication'],
  'Collaborateur': ['dashboard', 'projects', 'resources', 'clients', 'sales', 'collaboration', 'communication'],
  'Personnel': ['dashboard', 'projects', 'resources', 'clients', 'collaboration', 'communication'],
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

              // ALSO update the personnel record with the UID if it's missing
              if (personnelData.uid !== user.uid) {
                await updateDoc(docSnap.ref, { uid: user.uid })
                  .catch(e => console.error("Personnel UID sync failed", e));
              }
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
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#F9FAFB] p-6 text-slate-900 font-sans relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-[120px] -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-100/30 rounded-full blur-[120px] -ml-64 -mb-64" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white relative"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-blue-600/30 text-white"
          >
            <Building2 size={40} />
          </motion.div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Choisir un Espace</h2>
          <p className="text-slate-500 text-sm font-medium">Sélectionnez ou créez votre environnement de travail Nexux.</p>
          
          <div className="mt-6 flex justify-center">
            {connStatus === 'testing' && (
              <span className="px-3 py-1 bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse">Vérification de Flux...</span>
            )}
            {connStatus === 'ok' && (
              <motion.span 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 border border-green-100 shadow-sm shadow-green-100/50"
              >
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Network Online (Cluster ERP)
              </motion.span>
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
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-2 flex items-center gap-2">
                    <span className="w-4 h-[1px] bg-slate-200" />
                    Propriétés Directes
                  </h3>
                  {ownedCompanies.map((c, i) => (
                    <motion.button
                      key={c.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      onClick={() => onSelect(c)}
                      className="w-full flex items-center justify-between p-5 rounded-[1.5rem] border border-blue-50 bg-white hover:border-blue-600 hover:bg-blue-50/20 transition-all group relative shadow-sm hover:shadow-xl hover:shadow-blue-600/5 overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-bl-full -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-900 text-lg group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-inner">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <span className="block font-black text-slate-800 text-base group-hover:text-blue-900 tracking-tight">{c.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-widest">{c.joinCode}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Enterprise Mode • {c.employees?.length || 1} Mbrs</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
                        <ChevronRight size={16} />
                      </div>
                    </motion.button>
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
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-6 text-slate-900 font-sans relative overflow-hidden">
      {/* Immersive Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-100/20 rounded-full blur-[150px]" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-100/10 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full bg-white/70 backdrop-blur-2xl rounded-[3rem] p-12 shadow-[0_32px_128px_rgba(37,99,235,0.08)] border border-white relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 opacity-50" />
        
        <div className="flex flex-col items-center gap-6 mb-12 justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <NexusLogo className="w-24 h-24 drop-shadow-[0_10px_30px_rgba(37,99,235,0.2)]" />
          </motion.div>
          
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Nexus<span className="text-blue-600">ERP</span></h1>
            <div className="flex items-center gap-3 mt-3 justify-center">
               <span className="h-[1px] w-4 bg-slate-200" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Intelligence Industrielle</p>
               <span className="h-[1px] w-4 bg-slate-200" />
            </div>
          </div>
          
          <div className="mt-2">
            {connStatus === 'testing' && (
              <span className="px-3 py-1 bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse">Sync In Progress...</span>
            )}
            {connStatus === 'ok' && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-3 py-1 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 border border-blue-100 shadow-sm"
              >
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                Nexus Cloud Secured
              </motion.span>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {authError && (
            <div className="p-4 bg-red-50 text-red-700 text-[11px] font-bold rounded-2xl border border-red-100 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span className="leading-tight">{authError}</span>
              </div>
            </div>
          )}

          <div className="text-center mb-4">
            <p className="text-slate-500 text-sm font-medium">L'accès à l'écosystème Nexus est strictement sécurisé par authentification Google.</p>
          </div>

          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-4 shadow-xl shadow-blue-600/20 disabled:opacity-50 group"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor" opacity="0.9"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" opacity="0.7"/>
                  <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="currentColor" opacity="0.8"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" opacity="1"/>
                </svg>
                <span>Accès Nexus via Google</span>
              </>
            )}
          </button>
          
          <div className="flex items-center gap-4 py-4">
             <div className="flex-1 h-px bg-slate-100" />
             <div className="w-2 h-2 bg-slate-200 rounded-full" />
             <div className="flex-1 h-px bg-slate-100" />
          </div>
          
          <div className="mt-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
            <p className="text-[9px] text-blue-600 font-bold leading-tight">
              💡 Note : L'authentification Google permet une synchronisation automatique avec votre profil entreprise et vos privilèges Nexus Cloud.
            </p>
          </div>
          
          <p className="text-[9px] font-black text-slate-300 uppercase text-center tracking-[0.2em] px-8 leading-relaxed">
            Seuls les comptes autorisés par l'administration Nexus peuvent franchir la passerelle de sécurité.
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
        setUser(u);
        // Sync user profile to Firestore for notification lookups
        try {
          const userRef = doc(db, 'users', u.uid);
          await setDoc(userRef, {
            uid: u.uid,
            email: u.email?.toLowerCase() || null,
            displayName: u.displayName || null,
            photoURL: u.photoURL || null,
            lastLogin: serverTimestamp()
          }, { merge: true });
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
    { id: 'collaboration', label: 'Collaboration & Comm', icon: Handshake },
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
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {windowWidth < 1024 && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30"
          />
        )}
      </AnimatePresence>

      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? (windowWidth < 640 ? windowWidth : 300) : (windowWidth < 1024 ? 0 : 96),
          x: (windowWidth < 1024 && !isSidebarOpen) ? -320 : 0
        }}
        className={cn(
          "h-screen bg-slate-950 border-r border-white/5 flex flex-col z-40 relative shrink-0 transition-all shadow-2xl",
          windowWidth < 1024 && "fixed left-0 top-0"
        )}
      >
        <div className="p-8 h-24 flex items-center justify-between border-b border-white/5 bg-gradient-to-br from-slate-900 to-slate-950">
          <div className="flex items-center gap-4 w-full">
            <div className="shrink-0 flex items-center justify-center p-2 bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/20">
              <NexusLogo className="w-8 h-8 filter brightness-200" />
            </div>
            
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="overflow-hidden flex-1"
                >
                  {activeTab === 'admin' ? (
                    <div className="font-black text-blue-400 text-xl tracking-tighter leading-none">
                      NEXUS <span className="text-white">CORE</span>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <select 
                        value={currentCompany.id}
                        onChange={(e) => {
                          const c = companies.find(c => c.id === e.target.value);
                          if (c) setCurrentCompany(c);
                        }}
                        className="font-black text-lg tracking-tight bg-transparent text-white border-none p-0 focus:ring-0 cursor-pointer w-full leading-none appearance-none"
                      >
                        {companies.map(c => (
                          <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">{currentCompany.joinCode}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)} 
            className="p-2.5 hover:bg-white/5 text-slate-500 hover:text-white transition-all rounded-xl ml-2"
          >
            {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 py-10 px-4 space-y-2 overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div className="space-y-2">
              {navItems.map((item, i) => (
                <motion.button
                  key={item.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (windowWidth < 1024) setSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-5 px-5 py-4 rounded-[1.25rem] transition-all group relative overflow-hidden",
                    activeTab === item.id 
                      ? "bg-blue-600 text-white shadow-2xl shadow-blue-600/20" 
                      : "text-slate-500 hover:bg-white/5 hover:text-slate-200"
                  )}
                >
                  <div className={cn(
                    "transition-all duration-500 group-hover:rotate-[360deg]",
                    activeTab === item.id ? "text-white" : "text-slate-600 group-hover:text-blue-400"
                  )}>
                    <item.icon size={22} strokeWidth={2.5} />
                  </div>
                  {isSidebarOpen && (
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] shrink-0">{item.label}</span>
                  )}
                  
                  {activeTab === item.id && (
                    <motion.div 
                      layoutId="sidebar-active-blob"
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-l-full shadow-[0_0_15px_#fff]" 
                    />
                  )}
                </motion.button>
              ))}
            </motion.div>
          </AnimatePresence>
        </nav>

        <div className="p-6 border-t border-white/5 flex flex-col gap-3">
          <button 
            onClick={() => setCurrentCompany(null)}
            className="w-full flex items-center gap-5 px-5 py-4 rounded-2xl bg-white/5 text-slate-400 hover:text-white transition-all group border border-transparent hover:border-white/10"
          >
            <Database size={20} className="group-hover:rotate-12 transition-transform" />
            {isSidebarOpen && <span className="text-[9px] font-black uppercase tracking-widest">Changer d'Espace</span>}
          </button>
          
          <button 
            onClick={logout}
            className="w-full flex items-center gap-5 px-5 py-4 rounded-2xl text-slate-500 hover:text-red-400 transition-all group"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            {isSidebarOpen && <span className="text-[9px] font-black uppercase tracking-widest">Fin de Session</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col h-screen bg-slate-50">
        {/* Top Header */}
        <header className="h-24 px-6 sm:px-12 border-b border-slate-100 bg-white/80 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)} 
              className="lg:hidden p-3 bg-slate-900 text-white rounded-2xl shadow-xl flex items-center justify-center shrink-0"
            >
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-1">Système Nexus Operational</h2>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
                {activeTab === 'admin' ? "Console Maître" : navItems.find(n => n.id === activeTab)?.label}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="hidden lg:flex items-center px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner group transition-all focus-within:ring-2 focus-within:ring-blue-100">
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
                    {user.displayName || user.email.split('@')[0]}
                  </span>
                  <span className="text-[7px] sm:text-[8px] font-black text-blue-500 uppercase tracking-[0.1em] px-1.5 sm:px-2 py-0.5 bg-blue-50 rounded-full border border-blue-100 mt-0.5">
                    {user.role}
                  </span>
                </div>
                <div className="relative group cursor-pointer">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="User" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-[1.25rem] border-2 border-white shadow-lg sm:shadow-xl shadow-slate-200 object-cover" />
                  ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-[1.25rem] border-2 border-white shadow-lg sm:shadow-xl shadow-slate-200 bg-slate-100 flex items-center justify-center text-slate-500 font-black text-base sm:text-lg">
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
