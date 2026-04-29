import React, { useState, useEffect } from 'react';
import { auth, loginWithEmail, signupWithEmail, logout, db, onAuthStateChanged, addDoc, collection, query, where, getDocs, doc, updateDoc, arrayUnion } from './lib/firebase';
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
  TrendingUp,
  AlertCircle,
  Building2,
  Shield,
  Calculator
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

import { bootstrapDemoData } from './lib/bootstrap';
import { useCompany } from './lib/CompanyContext';

export const DEFAULT_ROLES: Record<string, string[]> = {
  'owner': ['dashboard', 'sales', 'clients', 'personnel', 'resources', 'projects', 'accounting'],
  'Directeur': ['dashboard', 'sales', 'clients', 'personnel', 'resources', 'projects', 'accounting'],
  'Secrétaire': ['dashboard', 'clients', 'personnel', 'resources'],
  'Comptable': ['dashboard', 'sales', 'projects', 'accounting'],
  'Agent Commercial': ['dashboard', 'sales', 'clients'],
  'Collaborateur': ['dashboard', 'projects'],
};

function WorkspaceSelector({ companies, user, onSelect }: { companies: any[], user: User, onSelect: any }) {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creatingLocally, setCreatingLocally] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!newCompanyName.trim()) return;
    if (adminCode !== 'NEXUS-ADMIN') {
      setErrorMsg('Code d\'autorisation administrateur invalide.');
      return;
    }
    setCreatingLocally(true);
    try {
      const generatedJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const docRef = await addDoc(collection(db, 'companies'), {
        name: newCompanyName,
        ownerId: user.uid,
        memberEmails: [user.email],
        employees: [user.uid],
        joinCode: generatedJoinCode
      });
      onSelect({ id: docRef.id, name: newCompanyName, ownerId: user.uid, joinCode: generatedJoinCode });
    } catch(err) {
      console.error(err);
      setErrorMsg('Erreur lors de la création.');
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
        
        const companyEmployees = Array.isArray(company.employees) ? company.employees : [];
        
        await updateDoc(doc(db, 'companies', company.id), {
          employees: arrayUnion(user.uid),
          memberEmails: arrayUnion(user.email)
        });
        
        onSelect({ ...company, employees: [...companyEmployees, user.uid] });
      } else {
        setErrorMsg('Code d\'entreprise invalide.');
      }
    } catch(err) {
      console.error(err);
      setErrorMsg('Erreur lors de l\'intégration.');
    } finally {
      setCreatingLocally(false);
    }
  };

  const ownedCompanies = companies.filter(c => c.ownerId === user?.uid || c.ownerEmail === user?.email);
  const joinedCompanies = companies.filter(c => c.ownerId !== user?.uid && c.ownerEmail !== user?.email);

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
          <h2 className="text-2xl font-bold tracking-tight">Bienvenue, {user.displayName || user.email?.split('@')[0]}</h2>
          <p className="text-sm text-slate-500 mt-2">Sélectionnez ou rejoignez un espace de travail.</p>
          {(user.email === 'hackeurfaurest@gmail.com' || user.email === 'dangafelicite@gmail.com') && (
            <button 
              onClick={() => onSelect({ id: 'comp_nexus_master', name: 'Nexus Enterprise Global', ownerId: 'master_nexus_01', joinCode: 'NEXUS-ADMIN' })}
              className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10"
            >
              <Shield size={14} className="text-blue-400" />
              Console Maître NEXUS
            </button>
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
            <div className="p-3 bg-blue-50 text-blue-700 rounded-xl text-xs font-medium border border-blue-100">
              <strong>Création Restreinte :</strong> La création de nouvelles entreprises est soumise à une autorisation.
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Code Administrateur</label>
              <input 
                type="text" 
                value={adminCode}
                onChange={e => setAdminCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-medium text-sm"
                placeholder="NEXUS-ADMIN"
                required
              />
            </div>
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
      </motion.div>
    </div>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      console.error(err);
      let errorMessage = 'Erreur lors de l\'authentification.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMessage = 'Email ou mot de passe incorrect.';
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMessage = 'L\'authentification par email n\'est pas activée. Contactez l\'administrateur.';
      }
      setAuthError(errorMessage);
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
        <div className="flex items-center gap-4 mb-8 justify-center">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/30">
            <LayoutDashboard size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">NexusERP</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Enterprise Management</p>
          </div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {authError && (
            <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 flex items-center gap-2">
              <AlertCircle size={16} />
              <span className="flex-1 overflow-hidden text-ellipsis">{authError}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email professionnel</label>
            <input 
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              placeholder="votre@entreprise.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Mot de passe</label>
            <input 
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            {loading ? 'Connexion en cours...' : 'Se Connecter'}
            {!loading && <ChevronRight size={16} />}
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-slate-50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NexusERP Industrial System</p>
          <p className="text-[9px] text-slate-300 mt-1 uppercase font-mono tracking-tighter">Accès restreint au personnel autorisé</p>
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
  const { currentCompany, companies, setCurrentCompany, loading: companyLoading } = useCompany();

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user && currentCompany && !user.role) {
      if (currentCompany.ownerEmail === user.email || currentCompany.ownerId === user.uid) {
        setUser(prev => prev ? { ...prev, role: 'owner' } : null);
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
              setUser(prev => prev ? { ...prev, role: memberData.role || 'Personnel' } : null);
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
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      
      // Check if current activeTab is allowed for new user role
      if (u) {
        const allowed = (currentCompany?.roles || DEFAULT_ROLES)[u.role] || ['dashboard'];
        if (!allowed.includes(activeTab)) {
          setActiveTab('dashboard');
        }
      }
    });
    return unsubscribe;
  }, [activeTab, currentCompany]);

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

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'sales', label: 'Ventes & Facturation', icon: TrendingUp },
    { id: 'clients', label: 'Partenaires Clients', icon: Users },
    { id: 'personnel', label: 'Ressources Humaines', icon: Briefcase },
    { id: 'resources', label: 'Stocks & Logistique', icon: Package },
    { id: 'projects', label: 'Projets & Tâches', icon: FolderKanban },
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
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-3 w-full"
              >
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-600/20 shrink-0">
                  {currentCompany.name.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)} 
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all rounded-xl"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 py-8 px-4 space-y-2">
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

        <div className="p-4 border-t border-slate-100">
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
          <div>
            <h1 className="text-sm font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
              {navItems.find(n => n.id === activeTab)?.label}
            </h1>
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
            
            <button className="p-2.5 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-full relative transition-all group">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
            </button>

            <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-900 leading-tight">{user.displayName}</p>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">
                  {user.email === 'hackeurfaurest@gmail.com' ? 'Accès Maître' : 'Accès Standard'}
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
              {activeTab === 'dashboard' && <DashboardModule user={user} />}
              {activeTab === 'sales' && <SalesModule />}
              {activeTab === 'clients' && <ClientModule />}
              {activeTab === 'personnel' && <PersonnelModule />}
              {activeTab === 'resources' && <ResourceModule />}
              {activeTab === 'projects' && <ProjectModule />}
              {activeTab === 'accounting' && <AccountingModule />}
              {activeTab === 'admin' && user.email === 'hackeurfaurest@gmail.com' && <AdminModule />}
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
