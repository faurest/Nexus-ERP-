import React, { useState, useEffect } from 'react';
import { auth, loginWithGoogle, loginWithEmail, signupWithEmail, logout, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { addDoc, collection } from 'firebase/firestore';
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
  TrendingUp,
  AlertCircle,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Modules
import DashboardModule from './components/DashboardModule';
import PersonnelModule from './components/PersonnelModule';
import ClientModule from './components/ClientModule';
import ResourceModule from './components/ResourceModule';
import ProjectModule from './components/ProjectModule';

import { bootstrapDemoData } from './lib/bootstrap';
import { useCompany } from './lib/CompanyContext';

function WorkspaceSelector({ companies, user, onSelect }: { companies: any[], user: User, onSelect: any }) {
  const [isCreating, setIsCreating] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [creatingLocally, setCreatingLocally] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    setCreatingLocally(true);
    try {
      const docRef = await addDoc(collection(db, 'companies'), {
        name: newCompanyName,
        ownerId: user.uid,
        memberEmails: []
      });
      onSelect({ id: docRef.id, name: newCompanyName, ownerId: user.uid });
    } catch(err) {
      console.error(err);
      setCreatingLocally(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50 p-6 text-slate-900 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl shadow-slate-200 border border-slate-100"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30 text-white">
            <Building2 size={32} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Bienvenue, {user.displayName?.split(' ')[0]}</h2>
          <p className="text-sm text-slate-500 mt-2">Sélectionnez un espace de travail ou créez-en un nouveau.</p>
        </div>

        {companies.length > 0 && !isCreating ? (
          <div className="space-y-3 mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">Vos espaces</h3>
            {companies.map(c => (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-slate-700 group-hover:text-slate-900">{c.name}</span>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
              </button>
            ))}
          </div>
        ) : null}

        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-500 hover:text-blue-600 font-bold transition-all"
          >
            <Plus size={20} />
            Créer une nouvelle entreprise
          </button>
        )}

        {isCreating && (
          <form onSubmit={handleCreate} className="space-y-4 cursor-default text-left">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nom de l'entreprise</label>
              <input 
                type="text" 
                value={newCompanyName}
                onChange={e => setNewCompanyName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-medium"
                placeholder="Ex: Nexus Corp"
                autoFocus
                required
              />
            </div>
            <div className="flex gap-3">
              {companies.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
              )}
              <button
                type="submit"
                disabled={creatingLocally || !newCompanyName.trim()}
                className="flex-[2] px-4 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {creatingLocally ? 'Création...' : (
                  <>
                    <Plus size={18} />
                    Créer l'espace
                  </>
                )}
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
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
      if (isLoginMode) {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password);
      }
    } catch (err: any) {
      console.error(err);
      let errorMessage = 'Erreur lors de l\'authentification.';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Cet email est déjà utilisé. Veuillez vous connecter.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMessage = 'Email ou mot de passe incorrect.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Le mot de passe est trop faible (minimum 6 caractères).';
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

        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          {authError && (
            <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 flex items-center gap-2">
              <AlertCircle size={16} />
              <span className="flex-1 overflow-hidden text-ellipsis">{authError}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email</label>
            <input 
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              placeholder="votre@email.com"
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
              minLength={6}
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            {loading ? 'Patientez...' : (isLoginMode ? 'Se Connecter' : 'Créer un compte')}
            {!loading && <ChevronRight size={16} />}
          </button>
        </form>

        <div className="flex items-center gap-4 mb-6 text-slate-300">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Ou</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        <button 
          onClick={loginWithGoogle}
          type="button"
          className="w-full bg-slate-900 text-white py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide hover:bg-slate-800 transition-all flex items-center justify-center gap-3 group shadow-xl shadow-slate-900/20"
        >
          Continuer avec Google
          <ChevronRight className="group-hover:translate-x-1 transition-transform" size={16} />
        </button>

        <div className="mt-8 text-center">
          <button 
            type="button"
            onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(''); }}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest"
          >
            {isLoginMode ? "Je n'ai pas de compte" : 'J\'ai déjà un compte'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const { currentCompany, companies, setCurrentCompany, loading: companyLoading } = useCompany();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      // Auto-bootstrap demo data for test account
      if (u && u.email === 'hackeurfaurest@gmail.com') {
        bootstrapDemoData().catch(console.error);
      }
    });
    return unsubscribe;
  }, []);

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
    { id: 'clients', label: 'Partenaires Clients', icon: Users },
    { id: 'personnel', label: 'Ressources Humaines', icon: Briefcase },
    { id: 'resources', label: 'Stocks & Logistique', icon: Package },
    { id: 'projects', label: 'Projets Stratégiques', icon: FolderKanban },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white flex overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        animate={{ width: isSidebarOpen ? 280 : 88 }}
        className="h-screen bg-white border-r border-slate-200 flex flex-col z-20 relative shrink-0 overflow-hidden"
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
        <header className="h-20 px-8 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              {navItems.find(n => n.id === activeTab)?.label}
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
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
                <img src={user.photoURL || ''} alt="User" className="w-10 h-10 rounded-2xl border-2 border-white shadow-md shadow-slate-200" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic View */}
        <div className="flex-1 p-8 pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="max-w-[1400px] mx-auto"
            >
              {activeTab === 'dashboard' && <DashboardModule />}
              {activeTab === 'clients' && <ClientModule />}
              {activeTab === 'personnel' && <PersonnelModule />}
              {activeTab === 'resources' && <ResourceModule />}
              {activeTab === 'projects' && <ProjectModule />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Global Footer */}
        <footer className="mt-auto px-8 py-6 border-t border-slate-200 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
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
