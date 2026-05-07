import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Package, 
  Briefcase,
  Download,
  Upload,
  Activity,
  Plus,
  Trash2,
  Edit2,
  Save,
  MessageSquare,
  ArrowLeft
} from 'lucide-react';
import { motion } from 'motion/react';
import Table, { TableRow } from './ui/Table';
import { cn } from '../lib/utils';
import { useCompany } from '../lib/CompanyContext';
import { exportCompanyDataAsJSON, importCompanyDataFromJSON } from '../lib/exportUtils';
import { collection, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from '../lib/firebase';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { createNotification } from '../lib/notifications';

export default function DashboardModule({ user, companies = [] }: { user?: any, companies?: any[] }) {
  const { currentCompany } = useCompany();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [services, setServices] = useState<any[]>([]);
  const [interventions, setInterventions] = useState<any[]>([]);
  
  const [newService, setNewService] = useState({ name: '', description: '', price: '' });
  const [newIntervention, setNewIntervention] = useState({ client: '', message: '', date: '', status: 'Planifié' });
  
  const [isAddingService, setIsAddingService] = useState(false);
  const [isAddingIntervention, setIsAddingIntervention] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [editingIntervention, setEditingIntervention] = useState<any | null>(null);

  const [tasks, setTasks] = useState<any[]>([]);
  const [newTask, setNewTask] = useState({ title: '', assignedTo: '', endDate: '' });
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [personnel, setPersonnel] = useState<any[]>([]);

  useEffect(() => {
    if (!currentCompany) return;

    const unsubServices = onSnapshot(query(collection(db, 'services'), where('companyId', '==', currentCompany.id)), snap => {
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'services'));

    const unsubInterventions = onSnapshot(query(collection(db, 'interventions'), where('companyId', '==', currentCompany.id)), snap => {
      setInterventions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'interventions'));

    const unsubTasks = onSnapshot(query(collection(db, 'tasks'), where('companyId', '==', currentCompany.id)), snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'tasks'));

    const unsubPersonnel = onSnapshot(query(collection(db, 'personnel'), where('companyId', '==', currentCompany.id)), snap => {
      setPersonnel(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'personnel'));

    return () => { unsubServices(); unsubInterventions(); unsubTasks(); unsubPersonnel(); };
  }, [currentCompany]);

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    try {
      if (editingService) {
        await updateDoc(doc(db, 'services', editingService.id), newService);
      } else {
        await addDoc(collection(db, 'services'), { ...newService, companyId: currentCompany.id });
      }
      setIsAddingService(false);
      setEditingService(null);
      setNewService({ name: '', description: '', price: '' });
    } catch (err: any) {
      handleFirestoreError(err, editingService ? OperationType.UPDATE : OperationType.WRITE, 'services');
    }
  };

  const handleDeleteService = async (id: string) => {
    if(!confirm('Supprimer ce service ?')) return;
    try {
      await deleteDoc(doc(db, 'services', id));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, 'services');
    }
  };

  const handleSaveIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    try {
      if (editingIntervention) {
        await updateDoc(doc(db, 'interventions', editingIntervention.id), newIntervention);
      } else {
        await addDoc(collection(db, 'interventions'), { ...newIntervention, companyId: currentCompany.id });
      }
      setIsAddingIntervention(false);
      setEditingIntervention(null);
      setNewIntervention({ client: '', message: '', date: '', status: 'Planifié' });
    } catch (err: any) {
      handleFirestoreError(err, editingIntervention ? OperationType.UPDATE : OperationType.WRITE, 'interventions');
    }
  };

  const handleDeleteIntervention = async (id: string) => {
    if(!confirm('Supprimer ce message ?')) return;
    try {
      await deleteDoc(doc(db, 'interventions', id));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, 'interventions');
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    try {
      await addDoc(collection(db, 'tasks'), {
        ...newTask,
        companyId: currentCompany.id,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      const recipients = [...(currentCompany.employees || [])];
      if (!recipients.includes(currentCompany.ownerId)) recipients.push(currentCompany.ownerId);

      await createNotification(
        currentCompany.id,
        recipients,
        'Nouvelle Tâche',
        `Une nouvelle tâche "${newTask.title}" a été assignée.`,
        'task'
      );

      setIsAddingTask(false);
      setNewTask({ title: '', assignedTo: '', endDate: '' });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'tasks');
    }
  };

  const role = user?.role || 'Directeur';

  // Determine if it's a newly created enterprise (< 1 day)
  const isNewEnterprise = currentCompany?.createdAt && (Date.now() - new Date(currentCompany.createdAt).getTime()) < 24 * 60 * 60 * 1000;

  const welcomeMessages: Record<string, string> = {
    'owner': 'Bienvenue dans votre poste de commande global.',
    'Directeur': 'Bienvenue dans votre poste de commande global.',
    'Secrétaire': 'Prête pour la gestion administrative ? Voici les priorités du jour.',
    'Comptable': 'Analyse financière et consolidation des flux en cours.',
  };

  const coordinationFlux = [
    { from: 'Direction', to: 'Tous', msg: 'Réunion de coordination à 14h00.', time: 'Il y a 10 min', type: 'info' },
    { from: 'Secrétariat', to: 'Comptabilité', msg: 'Factures clients reçues et scannées.', time: 'Il y a 45 min', type: 'success' },
    { from: 'Logistique', to: 'Secrétariat', msg: 'Nouveau stock de consommables arrivant demain.', time: 'Il y a 2h', type: 'warning' },
  ];

  const handleExport = async () => {
    if (!currentCompany) return;
    setIsExporting(true);
    try {
      await exportCompanyDataAsJSON(currentCompany.id, currentCompany.name);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Erreur lors de l'extraction des données.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentCompany) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Attention : L'import va fusionner et mettre à jour les données actuelles de la plateforme selon le fichier JSON. Souhaitez-vous continuer ?")) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonString = event.target?.result as string;
          const jsonData = JSON.parse(jsonString);
          
          await importCompanyDataFromJSON(currentCompany.id, jsonData);
          alert("Données importées avec succès !");
          // Optionally simple page reload to reflect changes
          window.location.reload();
        } catch (error: any) {
          console.error("Import parsing failed:", error);
          alert("Erreur lors de la lecture ou de l'importation locale : " + error.message);
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("Import file read failed:", error);
      alert("Erreur lors de la lecture du fichier.");
      setIsImporting(false);
    }
  };

  const stats = [
    { label: 'Ventes du mois', value: '45,200 FCFA', icon: TrendingUp, trend: '+12%', color: 'text-green-600' },
    { label: 'Nouveaux Clients', value: '24', icon: Users, trend: '+5%', color: 'text-blue-600' },
    { label: 'Tâches en retard', value: '8', icon: AlertCircle, trend: '-2', color: 'text-red-500' },
    { label: 'Ruptures Stock', value: '3', icon: Package, trend: 'Critique', color: 'text-orange-600' },
  ];

  const moduleCards = [
    { id: 'projects', label: 'Projets', img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=600', desc: 'Gestion des flux', size: 'large' },
    { id: 'personnel', label: 'Ressources Humaines', img: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=600', desc: 'Équipes et talents', size: 'small' },
    { id: 'sales', label: 'Ventes & CRM', img: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1600', desc: 'Performance', size: 'small' },
    { id: 'finances', label: 'Finance', img: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=600', desc: 'Flux financiers', size: 'medium' },
    { id: 'stock', label: 'Logistique', img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=600', desc: 'Stocks', size: 'medium' },
    { id: 'clients', label: 'Clients', img: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=600', desc: 'Portefeuille', size: 'medium' },
  ];

  return (
    <div className="space-y-10 pb-20">
      {/* Immersive Command Header */}
      <div className="relative overflow-hidden bg-slate-950 rounded-[2rem] lg:rounded-[2.5rem] p-6 lg:p-12 text-white shadow-2xl group border border-white/5">
        <div className="absolute inset-0 z-0 scale-105 blur-2xl opacity-20 pointer-events-none">
          <img 
             src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1600" 
             className="w-full h-full object-cover" 
             alt="abstract"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-indigo-600/20 z-0 opacity-50" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12">
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full mb-6">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-blue-400">Nexus OS • Operational Command</span>
              </div>
              <h1 className="text-3xl lg:text-5xl font-black tracking-tight mb-4 leading-tight">
                Bonjour, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">{user?.displayName || 'Commandant'}</span>
              </h1>
              <p className="text-slate-400 text-xs lg:text-sm font-medium leading-relaxed max-w-md opacity-80">
                {welcomeMessages[role] || "Accédez à une vision 360° optimisée de vos actifs, flux financiers et capital humain."}
              </p>
            </motion.div>
          </div>
          
          <div className="flex flex-wrap gap-4 shrink-0 lg:bg-white/5 lg:backdrop-blur-md lg:p-2 lg:rounded-3xl lg:border lg:border-white/10">
             {(!isNewEnterprise || role === 'owner') && (
              <>
                <button 
                  onClick={() => document.getElementById('import-json')?.click()}
                  disabled={isImporting || isExporting}
                  className="px-6 py-4 rounded-2xl bg-white/5 lg:bg-transparent border border-white/10 lg:border-none text-white text-[9px] font-black uppercase tracking-[0.15em] hover:bg-white/10 transition-all flex items-center gap-3 group/btn"
                >
                  <Upload size={14} className="group-hover:-translate-y-1 transition-transform" />
                  {isImporting ? 'Sync...' : 'Import Data'}
                </button>
                <input type="file" accept=".json" id="import-json" hidden onChange={handleImport} />
                
                <button 
                  onClick={handleExport}
                  disabled={isExporting || isImporting}
                  className="px-6 py-4 rounded-2xl bg-blue-600 text-white text-[9px] font-black uppercase tracking-[0.15em] hover:bg-blue-500 transition-all shadow-[0_15px_30px_rgba(37,99,235,0.2)] flex items-center gap-3"
                >
                  <Download size={14} />
                  {isExporting ? 'Process...' : 'Extraction'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* KPI Row - Top 4 cards */}
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-5 lg:p-7 rounded-3xl lg:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110",
                stat.color.includes('green') ? 'bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white' : 
                stat.color.includes('blue') ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white' : 
                stat.color.includes('red') ? 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white' : 
                'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white'
              )}>
                <stat.icon size={20} />
              </div>
              <div className={cn(
                "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                stat.trend.includes('+') ? 'bg-green-100 text-green-700' : 
                stat.trend === 'Critique' ? 'bg-red-100 text-red-700 animate-pulse' :
                'bg-blue-100 text-blue-700'
              )}>
                {stat.trend}
              </div>
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-slate-900 leading-none">{stat.value}</h3>
          </motion.div>
        ))}

        {/* Intelligence Hub (Chart) - Spans 8 cols */}
        <div className="col-span-12 xl:col-span-8 bg-white rounded-3xl lg:rounded-[2.5rem] p-6 lg:p-10 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-30 -mr-32 -mt-32 scale-0 group-hover:scale-100 transition-transform duration-1000" />
          
          <div className="flex justify-between items-center mb-10 relative z-10">
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Intelligence Flux</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Performance opérationnelle en temps réel</p>
            </div>
            <div className="flex gap-2">
              {['24h', '7j', '30j'].map((t, i) => (
                <button key={t} className={cn(
                  "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                  i === 2 ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"
                )}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[280px] flex items-end gap-3.5 relative z-10">
            {[45, 62, 55, 78, 68, 92, 85, 76, 88, 95, 82, 98].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 group/bar">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${v}%` }}
                  transition={{ delay: 0.5 + i * 0.05, duration: 0.8 }}
                  className={cn(
                    "w-full rounded-t-xl transition-all duration-500 relative",
                    i === 11 ? "bg-blue-600 shadow-[0_8px_20px_rgba(37,99,235,0.25)]" : "bg-slate-100 group-hover/bar:bg-blue-100"
                  )}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity">
                    {v}k
                  </div>
                </motion.div>
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Global Status - Spans 4 cols */}
        <div className="col-span-12 xl:col-span-4 bg-slate-900 rounded-3xl lg:rounded-[2.5rem] p-7 lg:p-9 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/40 via-transparent to-transparent z-0 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Activity size={16} />
              </div>
              <div>
                <h3 className="text-md font-black uppercase tracking-wider">Passerelle Nexus</h3>
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Connecté • 98.4% Health</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {[
                { label: 'Uptime Système', val: '99.9%', w: '99%' },
                { label: 'Flux Trésorerie', val: 'Stable', w: '85%' },
                { label: 'Stock Critique', val: '2 items', w: '20%' },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">{s.label}</span>
                    <span className="text-[10px] font-black text-white">{s.val}</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: s.w }}
                      transition={{ duration: 1.2, delay: 0.8 }}
                      className={cn("h-full rounded-full transition-all", s.w === '20%' ? 'bg-orange-500' : 'bg-blue-500')}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md relative z-10 transition-transform hover:scale-[1.02] cursor-default">
             <div className="flex items-center gap-2 mb-2">
               <AlertCircle size={14} className="text-blue-400" />
               <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Recommandation AI</span>
             </div>
             <p className="text-[11px] font-medium text-slate-300 leading-relaxed italic">"Optimisez vos flux de trésorerie en consolidant les règlements fournisseurs demain."</p>
          </div>
        </div>

        {/* Modules Navigation - Bento Style Cards */}
        <div className="col-span-12 grid grid-cols-12 gap-8 mt-4">
           {moduleCards.map((card, idx) => (
             <motion.div
               key={card.id}
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: 0.2 + idx * 0.1 }}
               className={cn(
                 "relative group cursor-pointer overflow-hidden rounded-3xl lg:rounded-[2.5rem] bg-slate-100 border border-white shadow-md hover:shadow-2xl transition-all duration-700",
                 card.size === 'large' ? "col-span-12 lg:col-span-6 h-[250px] lg:h-[420px]" : 
                 card.size === 'medium' ? "col-span-12 md:col-span-6 lg:col-span-4 h-[220px] lg:h-[300px]" : 
                 "col-span-12 md:col-span-6 lg:col-span-3 h-[220px] lg:h-[300px]"
               )}
             >
               <img src={card.img} className="absolute inset-0 w-full h-full object-cover grayscale-[0.2] brightness-75 group-hover:scale-110 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-1000" alt={card.label} />
               <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent opacity-80 group-hover:opacity-40 transition-opacity duration-700" />
               
               <div className="absolute top-0 right-0 p-6 lg:p-8 z-20">
                 <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white opacity-100 lg:opacity-0 group-hover:opacity-100 translate-x-0 lg:translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                    <Plus size={18} />
                 </div>
               </div>

               <div className="absolute bottom-0 left-0 p-6 lg:p-10 text-white z-20 w-full">
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-2 block translate-y-0 lg:translate-y-4 opacity-100 lg:opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-100">{card.desc}</span>
                 <h3 className="text-2xl lg:text-3xl font-black tracking-tight leading-none group-hover:tracking-wider transition-all duration-500">{card.label}</h3>
                 <div className="mt-6 w-12 h-1.5 bg-blue-600 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-700 delay-200" />
               </div>
             </motion.div>
           ))}
        </div>

        {/* Operational Pulsation (Lower Section) */}
        <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mt-4">
           {/* Interventions / Messages */}
           <section className="bg-slate-950 text-white rounded-[2rem] lg:rounded-[2.5rem] p-7 lg:p-9 border border-white/5 shadow-2xl relative group overflow-hidden">
             <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover:scale-[1.7] group-hover:rotate-6 transition-all duration-1000">
                <MessageSquare size={140} />
             </div>
             <div className="flex items-center justify-between mb-10 relative z-10">
               <div>
                 <h3 className="text-xl font-black uppercase tracking-tight">Flux Interventions</h3>
                 <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Activité temps réel & RDV</p>
               </div>
               <button onClick={() => setIsAddingIntervention(true)} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all">
                 <Plus size={18} />
               </button>
             </div>

             <div className="space-y-4 relative z-10">
               {interventions.slice(0, 4).map((item, i) => (
                 <div key={item.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex items-center gap-4 group/item">
                    <div className={cn(
                      "w-1.5 h-8 rounded-full",
                      item.status === 'Terminé' ? 'bg-green-500' : 'bg-blue-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase truncate">{item.client}</span>
                        <span className="text-[8px] font-black text-slate-500 uppercase">{item.date}</span>
                      </div>
                      <p className="text-xs font-semibold truncate text-slate-200">{item.message}</p>
                    </div>
                 </div>
               ))}
               {interventions.length === 0 && <p className="text-center text-slate-600 text-xs font-bold py-8 uppercase tracking-widest">Aucun flux détecté</p>}
             </div>
           </section>

           {/* Service Center */}
           <section className="bg-white rounded-[2rem] lg:rounded-[2.5rem] p-7 lg:p-9 border border-slate-100 shadow-sm relative group overflow-hidden">
              <div className="flex items-center justify-between mb-10 relative z-10">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Catalogue Services</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gérer l'offre commerciale</p>
                </div>
                <button onClick={() => setIsAddingService(true)} className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 flex items-center justify-center transition-all">
                  <Plus size={18} className="text-slate-900" />
                </button>
              </div>

              <div className="space-y-4 relative z-10">
                {services.slice(0, 4).map(s => (
                  <div key={s.id} className="p-4 rounded-2xl border border-slate-50 bg-slate-50/50 hover:border-blue-200 hover:bg-white transition-all flex items-center justify-between group/s">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-600 border border-slate-100 group-hover/s:bg-blue-600 group-hover/s:text-white transition-all">
                        <Briefcase size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{s.name}</h4>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.price ? `${s.price} FCFA` : 'Sur devis'}</span>
                      </div>
                    </div>
                    <ArrowLeft size={14} className="text-slate-200 rotate-180 opacity-0 group-hover/s:opacity-100 translate-x-2 group-hover/s:translate-x-0 transition-all" />
                  </div>
                ))}
              </div>
           </section>

           {/* Task Orchestrator */}
           <section className="bg-white rounded-[2rem] lg:rounded-[2.5rem] p-7 lg:p-9 border border-slate-100 shadow-sm relative group overflow-hidden">
              <div className="flex items-center justify-between mb-10 relative z-10">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Project Engine</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ordonnancement des tâches</p>
                </div>
                <button onClick={() => setIsAddingTask(true)} className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 flex items-center justify-center transition-all">
                  <Plus size={18} className="text-slate-900" />
                </button>
              </div>

              <div className="space-y-4 relative z-10">
                {tasks.slice(0, 4).map(t => (
                  <div key={t.id} className="p-4 rounded-2xl border border-slate-50 bg-slate-50 hover:border-indigo-200 hover:bg-white transition-all">
                    <div className="flex justify-between items-start mb-2">
                       <h4 className="text-[11px] font-black text-slate-900 uppercase truncate pr-4">{t.title}</h4>
                       <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-widest group-hover:bg-indigo-600 group-hover:text-white transition-all">New</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <Clock size={10} className="text-slate-400" />
                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Assigné à: {personnel.find(p => p.id === t.assignedTo)?.name || 'Nexus Admin'}</span>
                    </div>
                  </div>
                ))}
              </div>
           </section>
        </div>

      </div>

      {/* Cross-tenant Global Overview */}
      {companies.filter(c => c.ownerId === user?.uid || c.ownerEmail === user?.email).length > 0 && (
        <div className="mt-12 bg-white rounded-3xl border border-blue-100 p-8 shadow-xl shadow-blue-900/5">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Vue d'ensemble de vos opérations</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">Status et performances des entités sous votre direction.</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Briefcase size={24} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {companies
              .filter(c => c.ownerId === user?.uid || c.ownerEmail === user?.email)
              .map(c => (
              <div key={c.id} className="p-5 border border-slate-200 rounded-2xl flex flex-col gap-4 hover:border-blue-300 transition-colors bg-slate-50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100/50 rounded-bl-full -mr-12 -mt-12 group-hover:bg-blue-200/50 transition-colors" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center font-black text-slate-400 group-hover:text-blue-600 transition-colors">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{c.name}</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.joinCode}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-auto relative z-10 pt-4 border-t border-slate-200">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500">Membres</span>
                    <span className="font-bold text-slate-900">{Array.isArray(c.employees) ? c.employees.length : (c.memberEmails?.length || 1)}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-xs text-slate-500">Status</span>
                    <span className="font-bold text-emerald-600">Actif</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service Modal */}
      {isAddingService && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-6">{editingService ? 'Modifier Service' : 'Nouveau Service'}</h3>
            <form onSubmit={handleSaveService} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nom du service</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} required/>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Prix (ou vide si sur devis)</label>
                <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Description</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none h-24 resize-none" value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-8">
                <button type="button" onClick={() => setIsAddingService(false)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all font-mono">Annuler</button>
                <button type="submit" className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all font-mono shadow-md">{editingService ? 'Mettre à jour' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Intervention Modal */}
      {isAddingIntervention && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-6">{editingIntervention ? 'Modifier Intervention/Message' : 'Nouveau Message de Rendez-vous'}</h3>
            <form onSubmit={handleSaveIntervention} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nom du client</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none" value={newIntervention.client} onChange={e => setNewIntervention({...newIntervention, client: e.target.value})} required/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none" value={newIntervention.date} onChange={e => setNewIntervention({...newIntervention, date: e.target.value})} required/>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Message / Détails de l'intervention</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none h-24 resize-none" value={newIntervention.message} onChange={e => setNewIntervention({...newIntervention, message: e.target.value})} required/>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Statut</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none" value={newIntervention.status} onChange={e => setNewIntervention({...newIntervention, status: e.target.value})}>
                  <option value="Planifié">Planifié</option>
                  <option value="En cours">En cours</option>
                  <option value="Terminé">Terminé</option>
                  <option value="Annulé">Annulé</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-8">
                <button type="button" onClick={() => setIsAddingIntervention(false)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all font-mono">Annuler</button>
                <button type="submit" className="px-6 py-3 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all font-mono shadow-md">{editingIntervention ? 'Mettre à jour' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {isAddingTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Nouvelle Tâche</h3>
            <form onSubmit={handleSaveTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Titre de la tâche</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} required/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Assigné à</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none" value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}>
                    <option value="">Sélectionner...</option>
                    {personnel.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Échéance</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none" value={newTask.endDate} onChange={e => setNewTask({...newTask, endDate: e.target.value})}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-8">
                <button type="button" onClick={() => setIsAddingTask(false)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all font-mono">Annuler</button>
                <button type="submit" className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all font-mono shadow-md">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

