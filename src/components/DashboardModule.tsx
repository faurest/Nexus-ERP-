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
  MessageSquare
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
    { id: 'projects', label: 'Projets', img: 'https://images.unsplash.com/photo-1540350394557-8d14678e7f91?auto=format&fit=crop&q=80&w=600', desc: 'Gestion des flux et tâches' },
    { id: 'personnel', label: 'Ressources Humaines', img: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=600', desc: 'Équipes et talents' },
    { id: 'sales', label: 'Ventes & CRM', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=600', desc: 'Performance commerciale' },
    { id: 'finances', label: 'Finance', img: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=600', desc: 'Flux de trésorerie' },
  ];

  return (
    <div className="space-y-12">
      {/* Header and Export */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-8 sm:p-12 text-white shadow-2xl group">
        <div className="absolute inset-0 z-0 scale-110 blur-2xl opacity-20 group-hover:opacity-30 transition-opacity">
          <img 
             src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1600" 
             className="w-full h-full object-cover" 
             alt="abstract"
          />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
                Nexus <span className="text-blue-500">Command</span> Center
              </h1>
              <p className="text-slate-400 text-sm sm:text-lg font-medium leading-relaxed">
                {welcomeMessages[role] || "Votre interface de contrôle unifiée pour une gestion d'entreprise intelligente et réactive."}
              </p>
            </motion.div>
          </div>
          
          <div className="flex flex-wrap gap-4 w-full md:w-auto shrink-0">
             {(!isNewEnterprise || role === 'owner') && (
              <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                <input 
                  type="file" 
                  accept=".json" 
                  id="import-json" 
                  hidden 
                  onChange={handleImport}
                  disabled={isImporting || isExporting}
                />
                <button 
                  onClick={() => document.getElementById('import-json')?.click()}
                  disabled={isImporting || isExporting}
                  className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 backdrop-blur-md"
                >
                  <Upload size={16} />
                  {isImporting ? 'Sync...' : 'Importer Flux'}
                </button>
                
                <button 
                  onClick={handleExport}
                  disabled={isExporting || isImporting}
                  className="px-6 py-4 rounded-2xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center gap-2"
                >
                  <Download size={16} />
                  {isExporting ? 'Export...' : 'Extraction'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Module Quick Access (Bento Grid) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
           <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em]">Écosystèmes Nexus</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {moduleCards.map((card, idx) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="group cursor-pointer relative h-64 overflow-hidden rounded-[2rem] bg-slate-100 shadow-xl border border-white"
            >
              <img 
                src={card.img} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                alt={card.label}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6 text-white w-full">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1 block">{card.desc}</span>
                <h3 className="text-xl font-black leading-tight tracking-tight">{card.label}</h3>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats Grid */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Connecté au réseau NTRP (Nexus Transfer Registry Protocol)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all text-slate-600">
                <stat.icon size={18} />
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold",
                stat.color === 'text-green-600' ? "bg-green-100 text-green-700" :
                stat.color === 'text-blue-600' ? "bg-blue-100 text-blue-700" :
                stat.color === 'text-red-500' ? "bg-red-100 text-red-700" :
                "bg-orange-100 text-orange-700"
              )}>
                {stat.trend}
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{stat.value}</h3>
            
            <div className="absolute -bottom-2 -right-2 opacity-[0.03] scale-150 rotate-12">
              <stat.icon size={64} />
            </div>
          </motion.div>
        ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coordination Flux / Interventions */}
        <section className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl lg:col-span-1 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
             <MessageSquare size={120} />
          </div>
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Messages d'Intervention / Rendez-vous</h2>
              <p className="text-slate-400 text-xs mt-1">Gérer les interventions et communications de rendez-vous.</p>
            </div>
            <button 
              onClick={() => {
                setEditingIntervention(null);
                setNewIntervention({ client: '', message: '', date: '', status: 'Planifié' });
                setIsAddingIntervention(true);
              }}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="space-y-4 relative z-10 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {interventions.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-4">Aucun message d'intervention enregistré.</p>
            ) : interventions.map((item, i) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                <div className="flex justify-between items-start w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Client: {item.client}
                    </span>
                    <span className={cn(
                      "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                      item.status === 'Terminé' ? "bg-green-500/20 text-green-400" :
                      item.status === 'Annulé' ? "bg-red-500/20 text-red-400" :
                      "bg-blue-500/20 text-blue-400"
                    )}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingIntervention(item); setNewIntervention(item); setIsAddingIntervention(true); }} className="text-slate-400 hover:text-blue-400"><Edit2 size={12} /></button>
                    <button onClick={() => handleDeleteIntervention(item.id)} className="text-slate-400 hover:text-red-400"><Trash2 size={12} /></button>
                  </div>
                </div>
                <div className="w-full">
                  <span className="text-[9px] font-medium text-slate-500 block mb-1">Date: {item.date || 'Non spécifiée'}</span>
                  <p className="text-sm font-medium mt-1">{item.message}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Services */}
        <section className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 lg:col-span-1 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
             <Briefcase size={120} />
          </div>
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Services Disponibles</h2>
              <p className="text-slate-500 text-xs mt-1">Découvrez et gérez les services proposés.</p>
            </div>
            <button 
              onClick={() => {
                setEditingService(null);
                setNewService({ name: '', description: '', price: '' });
                setIsAddingService(true);
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-xl transition-all"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="space-y-4 relative z-10 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {services.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4">Aucun service défini.</p>
            ) : services.map((s, i) => (
              <div key={s.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col items-start gap-4 hover:border-blue-200 transition-all shadow-sm">
                <div className="flex justify-between items-start w-full">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded flex items-center justify-center shrink-0 border border-slate-200 shadow-sm">
                      <Briefcase size={18} className="text-blue-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 truncate">{s.name}</h4>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{s.price ? `${s.price} FCFA` : 'Sur devis'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditingService(s); setNewService(s); setIsAddingService(true); }} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 size={14}/></button>
                    <button onClick={() => handleDeleteService(s.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                  </div>
                </div>
                {s.description && (
                  <p className="text-xs text-slate-600">{s.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Tasks Hub */}
        <section className="bg-white border text-slate-800 border-slate-200 shadow-sm rounded-3xl p-6 lg:col-span-1 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
             <CheckCircle2 size={120} />
          </div>
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Tâches & Assignations</h2>
              <p className="text-slate-500 text-xs mt-1">Gérer les tâches en cours.</p>
            </div>
            <button 
              onClick={() => setIsAddingTask(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-xl transition-all"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="space-y-4 relative z-10 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {tasks.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4">Aucune tâche active.</p>
            ) : tasks.map((t) => (
              <div key={t.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col items-start gap-4 hover:border-blue-200 transition-all shadow-sm">
                <div className="flex justify-between items-start w-full">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded flex items-center justify-center shrink-0 border border-slate-200 shadow-sm">
                      <Clock size={18} className={t.status === 'completed' ? 'text-green-500' : 'text-amber-500'} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 truncate">{t.title}</h4>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{personnel.find(p => p.id === t.assignedTo)?.name || 'Non Assigné'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
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

