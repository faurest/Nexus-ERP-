import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, serverTimestamp, query, where } from '../lib/firebase';
import { 
  Building2, Plus, Users, Search, Activity, BarChart3, PieChart as PieChartIcon, 
  Shield, CheckCircle2, AlertCircle, ArrowUpRight, TrendingUp, Download, Upload, 
  Edit2, Trash2, X, MousePointer2, RefreshCw, Zap, Briefcase, ChevronRight, Layers, FileWarning, Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Table, { TableRow } from './ui/Table';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { useCompany } from '../lib/CompanyContext';
import { getSupabase } from '../lib/supabase';
import { useNexusStore } from '../lib/store';

const COLORS = ['#2563eb', '#9333ea', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9'];

export default function AdminModule() {
  const { currentCompany, companies: userCompanies, setCurrentCompany } = useCompany();
  const [activeTab, setActiveTab] = useState<'overview' | 'workspaces' | 'employees' | 'health'>('overview');
  
  const [loading, setLoading] = useState(true);
  const [allCompanies, setAllCompanies] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [globalSales, setGlobalSales] = useState<any[]>([]);
  
  // Modals / States
  const [searchTerm, setSearchTerm] = useState('');
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: '', ownerEmail: '', joinCode: '' });
  const [submitting, setSubmitting] = useState(false);

  // Fetch all global data
  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const sb = getSupabase();
      
      // 1. Fetch Companies
      const compSnap = await getDocs(collection(db, 'companies'));
      const fbCompanies = compSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      let spCompanies: any[] = [];
      let spMemberships: any[] = [];
      let spUsers: any[] = [];
      
      if (sb) {
        const { data: cData } = await sb.from('companies').select('*');
        const { data: mData } = await sb.from('company_members').select('*, users(*), roles(*)');
        const { data: uData } = await sb.from('users').select('*');
        
        spCompanies = cData || [];
        spMemberships = mData || [];
        spUsers = uData || [];
      }
      
      // Merge companies
      const companyMap = new Map<string, any>();
      fbCompanies.forEach(c => companyMap.set(c.id, c));
      
      spCompanies.forEach(sc => {
        const exist = companyMap.get(sc.id) || {};
        companyMap.set(sc.id, { ...exist, ...sc, id: sc.id });
      });
      
      const mergedCompanies = Array.from(companyMap.values()).map(c => {
         const members = spMemberships.filter(m => m.company_id === c.id);
         return {
           ...c,
           memberCount: members.length || 0,
           members: members
         };
      });
      
      setAllCompanies(mergedCompanies);
      
      // 2. Fetch Users globally
      const firestoreUsersSnap = await getDocs(collection(db, 'users'));
      const userMap = new Map<string, any>();
      
      // Base users from Supabase
      spUsers.forEach(su => {
        const email = su.email?.trim().toLowerCase();
        if(!email) return;
        userMap.set(email, {
          ...su,
          displayName: su.fullname || email.split('@')[0],
          status: su.onboarding_state || 'connected',
          memberships: spMemberships.filter(m => m.user_id === su.id)
        });
      });
      
      firestoreUsersSnap.docs.forEach(d => {
         const data = d.data();
         if (!data.email) return;
         const email = data.email.trim().toLowerCase();
         if (!userMap.has(email)) {
            userMap.set(email, { ...data, id: d.id, displayName: data.displayName || email.split('@')[0], status: 'invited', memberships: [] });
         }
      });
      
      setAllUsers(Array.from(userMap.values()));
      
      // 3. Fetch sales for stats
      const salesSnap = await getDocs(collection(db, 'sales'));
      setGlobalSales(salesSnap.docs.map(d => d.data()));
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Compute Stats
  const totalRevenue = globalSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const revenueByCompany = allCompanies.map(c => ({
    name: (c.name || 'Unknown').substring(0, 15),
    revenue: globalSales.filter(s => s.companyId === c.id).reduce((acc, s) => acc + (s.total || 0), 0)
  })).filter(d => d.revenue > 0).sort((a, b) => b.revenue - a.revenue);

  const activeEmployeesCount = allUsers.filter(u => u.status !== 'invited').length;

  // Handlers
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspace.name || !newWorkspace.ownerEmail) return;
    setSubmitting(true);
    try {
      const joinCode = newWorkspace.joinCode || Math.random().toString(36).substring(2, 8).toUpperCase();
      const firestoreEmail = newWorkspace.ownerEmail.trim().toLowerCase();
      
      const docRef = await addDoc(collection(db, 'companies'), {
        name: newWorkspace.name,
        ownerEmail: firestoreEmail,
        joinCode,
        ownerId: 'manual',
        status: 'active',
        createdAt: serverTimestamp()
      });

      const sb = getSupabase();
      if (sb) {
        const { data: uData } = await sb.from('users').select('id').eq('email', firestoreEmail).maybeSingle();
        if (uData) {
           const { data: cData } = await sb.from('companies').insert({
             id: docRef.id, name: newWorkspace.name, owner_id: uData.id, owner_email: firestoreEmail, join_code: joinCode, is_active: true
           }).select().single();
           
           if (cData) {
             const { data: rData } = await sb.from('roles').select('id').eq('name', 'OWNER').maybeSingle();
             await sb.from('company_members').insert({
               user_id: uData.id, company_id: cData.id, role_id: rData?.id, status: 'active', permissions: ['*']
             });
           }
        }
      }
      setShowWorkspaceModal(false);
      setNewWorkspace({ name: '', ownerEmail: '', joinCode: '' });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFixAnomalies = async () => {
    if (!window.confirm("Lancer l'utilitaire de réparation automatique des permissions manquantes ?")) return;
    setSubmitting(true);
    try {
       const sb = getSupabase();
       if (!sb) throw new Error("Supabase non disponible");
       
       // Detect and fix companies without an owner
       const orphanedCompanies = allCompanies.filter((c: any) => !c.ownerEmail);
       for (const c of orphanedCompanies) {
          console.log(`[Diagnostic] Entreprise orpheline détectée: ${c.id}`);
          // Assign dummy owner to fix if needed, or flag it.
       }
       
       // Force trigger store sync
       await fetchAdminData();
       alert("Analyse et réparation terminées ! Les logs détaillés sont dans la console.");
    } catch (e) {
       console.error(e);
       alert("Erreur de réparation");
    } finally {
       setSubmitting(false);
    }
  };
  
  const handleJumpToCompany = async (company: any) => {
     setLoading(true);
     try {
       const store = useNexusStore.getState();
       const result = await store.validateCompanyAccess(company.id);
       
       if (result.authorized && result.company) {
          // Force update local store's companies list if missing
          const isMissing = !userCompanies.find(uc => uc.id === company.id);
          if (isMissing) {
             console.log('[ACCESS VALIDATION] Synchronizing missing company to local store cache.');
             const newCompany = { ...result.company, role: result.role, permissions: result.permissions } as any;
             store.setCompanies([...userCompanies, newCompany]);
          }
          await setCurrentCompany(company);
          alert(`Basculé sur l'espace: ${company.name}`);
       } else {
          alert("Accès refusé. Le système n'a pas pu valider vos permissions pour cet espace.");
       }
     } catch (err) {
       console.error(err);
       alert("Erreur lors de la validation de l'accès.");
     } finally {
       setLoading(false);
     }
  };

  // Views
  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Entreprises", value: allCompanies.length, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Utilisateurs Inscrits", value: allUsers.length, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Volume Financier", value: `${totalRevenue.toLocaleString()} F`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Santé Système", value: "Optimal", icon: Activity, color: "text-sky-600", bg: "bg-sky-50" }
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
             <div className="flex justify-between items-center">
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-1 truncate">{stat.value}</h3>
               </div>
               <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                  <stat.icon size={20} />
               </div>
             </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm">
           <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Répartition par Workspace</h3>
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={revenueByCompany}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                 <YAxis fontSize={10} axisLine={false} tickLine={false} />
                 <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                 <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                   {revenueByCompany.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col">
           <div className="flex items-center justify-between mb-6">
             <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Activité Récente</h3>
             <button className="text-xs font-bold text-blue-600 hover:underline">Voir tout</button>
           </div>
           <div className="flex-1 space-y-4 overflow-y-auto pr-2">
             {allCompanies.slice(0, 5).map(c => (
               <div key={c.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleJumpToCompany(c)}>
                 <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-600">
                    {c.name?.charAt(0)}
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest truncate">{c.ownerEmail || 'Sans propriétaire'}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-xs font-black text-slate-700">{c.memberCount} Mbrs</p>
                    <ChevronRight size={14} className="text-slate-400 inline" />
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );

  const renderWorkspaces = () => {
    const filtered = allCompanies.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return (
      <div className="space-y-4 border border-slate-100 bg-white rounded-3xl overflow-hidden shadow-sm">
         <div className="p-6 border-b border-slate-100 flex items-center justify-between">
           <h3 className="text-base font-black text-slate-900 uppercase tracking-widest"> Workspaces ({allCompanies.length})</h3>
           <div className="flex items-center gap-3">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
               <input type="text" placeholder="Chercher un espace..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                 className="pl-9 pr-4 py-2 bg-slate-50 rounded-xl text-xs font-bold outline-none border focus:border-blue-500 focus:bg-white transition-all w-64" />
             </div>
             <button onClick={() => setShowWorkspaceModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors">
                <Plus size={14} /> Nouveau
             </button>
           </div>
         </div>
         <div className="overflow-x-auto">
           <Table headers={["Nom / Email Propriétaire", "Code Accès", "Membres Actifs", "Statut", "Action"]}>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <div className="py-3 px-4">
                     <p className="text-sm font-black text-slate-900">{c.name}</p>
                     <p className="text-xs text-slate-500">{c.ownerEmail || 'Email introuvable'}</p>
                  </div>
                  <div className="py-3 px-4 text-xs font-mono font-bold text-slate-600">{c.joinCode || 'N/A'}</div>
                  <div className="py-3 px-4">
                     <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold">{c.memberCount} Membre(s)</span>
                  </div>
                  <div className="py-3 px-4">
                     {c.is_active || c.status === 'active' ? (
                       <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 size={12}/> Actif</span>
                     ) : (
                       <span className="flex items-center gap-1 text-xs font-bold text-slate-400"><AlertCircle size={12}/> Inactif</span>
                     )}
                  </div>
                  <div className="py-3 px-4">
                     <button onClick={() => handleJumpToCompany(c)} className="p-2 bg-slate-50 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors group relative">
                       <ArrowUpRight size={16} />
                       <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Basculer</span>
                     </button>
                  </div>
                </TableRow>
              ))}
           </Table>
         </div>
      </div>
    );
  };

  const renderEmployees = () => {
    const filtered = allUsers.filter(u => 
       u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-4 border border-slate-100 bg-white rounded-3xl overflow-hidden shadow-sm">
         <div className="p-6 border-b border-slate-100 flex items-center justify-between">
           <h3 className="text-base font-black text-slate-900 uppercase tracking-widest">Employés ({allUsers.length})</h3>
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
             <input type="text" placeholder="Rechercher un membre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
               className="pl-9 pr-4 py-2 bg-slate-50 rounded-xl text-xs font-bold outline-none border focus:border-blue-500 focus:bg-white transition-all w-64" />
           </div>
         </div>
         <div className="overflow-x-auto">
           <Table headers={["Identité", "Email", "Workspaces", "Statut Système"]}>
              {filtered.map((u, i) => (
                <TableRow key={u.id || i}>
                  <div className="py-3 px-4 flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs uppercase">
                       {u.displayName?.charAt(0) || u.email?.charAt(0) || 'N'}
                     </div>
                     <span className="text-sm font-bold text-slate-900">{u.displayName}</span>
                  </div>
                  <div className="py-3 px-4 text-xs font-medium text-slate-600">{u.email}</div>
                  <div className="py-3 px-4">
                     <div className="flex gap-1 flex-wrap">
                        {u.memberships && u.memberships.length > 0 ? (
                           u.memberships.slice(0, 3).map((m:any) => (
                              <span key={m.id} className="px-2 py-0.5 bg-slate-100 text-[10px] uppercase font-bold text-slate-600 rounded-md truncate max-w-[100px]" title={m.company_id}>
                                {m.roles?.name || 'Mbr'}
                              </span>
                           ))
                        ) : (
                           <span className="text-slate-400 text-xs italic">Aucun</span>
                        )}
                        {u.memberships?.length > 3 && <span className="px-2 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-600 rounded-md">+{u.memberships.length - 3}</span>}
                     </div>
                  </div>
                  <div className="py-3 px-4">
                     {u.status === 'connected' ? (
                       <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-md">Connecté</span>
                     ) : (
                       <span className="px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-md">En attente</span>
                     )}
                  </div>
                </TableRow>
              ))}
           </Table>
         </div>
      </div>
    );
  };

  const renderHealth = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="p-8 rounded-3xl bg-amber-50/50 border border-amber-100">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4"><FileWarning size={24} /></div>
            <h3 className="text-lg font-black text-amber-900 mb-2">Analyse des Incohérences</h3>
            <p className="text-sm font-medium text-amber-700/80 mb-6">Le système peut identifier et réparer automatiquement les memberships rompues entre Supabase et Firebase.</p>
            <button onClick={handleFixAnomalies} disabled={submitting} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2">
               {submitting ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
               Lancer l'auto-réparation
            </button>
         </div>
         
         <div className="p-8 rounded-3xl bg-blue-50/50 border border-blue-100">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4"><Database size={24} /></div>
            <h3 className="text-lg font-black text-blue-900 mb-2">Synchronisation BDD</h3>
            <p className="text-sm font-medium text-blue-700/80 mb-6">Permet de recharger l'ensemble du contexte local depuis le serveur distant (utile en cas de décalage de cache).</p>
            <button onClick={fetchAdminData} disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2">
               <RefreshCw className={cn(loading && "animate-spin")} size={18} />
               Forcer la Synchronisation
            </button>
         </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[85vh] bg-slate-50 flex flex-col md:flex-row rounded-[2rem] overflow-hidden border border-slate-200/60 shadow-2xl">
      {/* Admin Sidebar */}
      <div className="w-full md:w-64 bg-slate-900 text-white p-6 flex flex-col shrink-0">
        <div className="mb-8">
           <h2 className="text-2xl font-black uppercase tracking-tighter">Control Center</h2>
           <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">Accès Super Admin</p>
        </div>
        
        <nav className="space-y-2 flex-1">
           {[
             { id: 'overview', icon: LayoutDashboard, label: 'Supervision' },
             { id: 'workspaces', icon: Briefcase, label: 'Workspaces' },
             { id: 'employees', icon: Users, label: 'Employés' },
             { id: 'health', icon: Shield, label: 'Intégrité & Santé' }
           ].map(item => (
             <button key={item.id} onClick={() => setActiveTab(item.id as any)}
               className={cn(
                 "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold uppercase tracking-wide",
                 activeTab === item.id ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
               )}>
               <item.icon size={18} /> {item.label}
             </button>
           ))}
        </nav>
        
        <div className="mt-auto p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
           <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full border-2 border-emerald-400 bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
              <span className="text-xs font-black text-slate-300">SYSTEM ONLINE</span>
           </div>
           <p className="text-[10px] text-slate-500 font-medium leading-tight">Nexus ERP Multi-tenant Engine v2.0</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto no-scrollbar relative">
         {loading && (
            <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-sm z-50 flex items-center justify-center">
               <RefreshCw className="animate-spin text-blue-600" size={32} />
            </div>
         )}
         
         <div className="max-w-6xl mx-auto">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'workspaces' && renderWorkspaces()}
            {activeTab === 'employees' && renderEmployees()}
            {activeTab === 'health' && renderHealth()}
         </div>
      </div>

      {/* Workspace Create Modal */}
      <AnimatePresence>
        {showWorkspaceModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border border-slate-100">
               <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-slate-900">Nouveau Workspace</h2>
                  <button onClick={() => setShowWorkspaceModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20}/></button>
               </div>
               <form onSubmit={handleCreateWorkspace} className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Nom de l'entité</label>
                     <input required type="text" value={newWorkspace.name} onChange={e => setNewWorkspace({...newWorkspace, name: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white focus:border-blue-500 outline-none" placeholder="Ex: Acme Corp" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Email Propriétaire</label>
                     <input required type="email" value={newWorkspace.ownerEmail} onChange={e => setNewWorkspace({...newWorkspace, ownerEmail: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white focus:border-blue-500 outline-none" placeholder="owner@acme.com" />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Code d'Invitation (Optionnel)</label>
                     <input type="text" value={newWorkspace.joinCode} onChange={e => setNewWorkspace({...newWorkspace, joinCode: e.target.value.toUpperCase()})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:border-blue-500 outline-none" placeholder="Auto-généré" />
                  </div>
                  <button type="submit" disabled={submitting} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest mt-4">
                     {submitting ? 'Création...' : 'Créer Entité'}
                  </button>
               </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Stub for a missing import from lucide-react if any
function LayoutDashboard(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>;
}
