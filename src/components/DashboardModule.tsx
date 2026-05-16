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
  ArrowLeft,
  AlertTriangle,
  CreditCard,
  Smartphone,
  Truck,
  History,
  BarChart3,
  PieChart,
  DollarSign,
  ShoppingCart,
  Zap,
  BookOpen,
  LayoutGrid,
  HardHat,
  Wheat,
  Settings,
  Hammer,
  Monitor,
  FolderKanban,
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
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);

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

    const unsubProducts = onSnapshot(query(collection(db, 'products'), where('companyId', '==', currentCompany.id)), snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'products'));

    const unsubOrders = onSnapshot(query(collection(db, 'ecommerce_orders'), where('companyId', '==', currentCompany.id)), snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'ecommerce_orders'));

    const unsubPayments = onSnapshot(query(collection(db, 'payments'), where('companyId', '==', currentCompany.id)), snap => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'payments'));

    const unsubHistory = onSnapshot(query(collection(db, 'order_history'), where('companyId', '==', currentCompany.id)), snap => {
      setOrderHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'order_history'));

    return () => { 
      unsubServices(); 
      unsubInterventions(); 
      unsubTasks(); 
      unsubPersonnel(); 
      unsubProducts(); 
      unsubOrders(); 
      unsubPayments();
      unsubHistory();
    };
  }, [currentCompany]);

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    try {
      if (editingService) {
        await updateDoc(doc(db, 'services', editingService.id), {
          ...newService,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'services'), { 
          ...newService, 
          companyId: currentCompany.id,
          createdAt: serverTimestamp()
        });
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
        await updateDoc(doc(db, 'interventions', editingIntervention.id), {
          ...newIntervention,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'interventions'), { 
          ...newIntervention, 
          companyId: currentCompany.id,
          createdAt: serverTimestamp()
        });
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
  const isEmptyState = products.length === 0 && orders.length === 0;

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

  const totalRevenue = orders
    .filter(o => o.status !== 'CANCELLED' && o.status !== 'CANCELLED_BY_SELLER')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const totalProfit = orders
    .filter(o => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + (o.realizedProfit || 0), 0);

  const stats = [
    { 
      label: 'Chiffre d\'Affaires', 
      value: `${totalRevenue.toLocaleString()} FCFA`, 
      icon: DollarSign, 
      trend: 'Global', 
      color: 'text-nexus-success',
      bg: 'bg-nexus-success/10'
    },
    { 
      label: 'Bénéfice Net', 
      value: `${totalProfit.toLocaleString()} FCFA`, 
      icon: TrendingUp, 
      trend: 'Réalisé', 
      color: 'text-nexus-accent',
      bg: 'bg-nexus-accent/10'
    },
    { 
      label: 'Succès Livraison', 
      value: `${orders.length > 0 ? Math.round((orders.filter(o => o.status === 'DELIVERED').length / (orders.filter(o => ['DELIVERED', 'DELIVERY_FAILED'].includes(o.status)).length || 1)) * 100) : 0}%`, 
      icon: Zap, 
      trend: 'Ops', 
      color: 'text-indigo-400',
      bg: 'bg-indigo-400/10'
    },
    { 
      label: 'Ruptures Stock', 
      value: products.filter(p => p.stock <= 0).length.toString(), 
      icon: Package, 
      trend: products.filter(p => p.stock <= (p.stockThreshold || 5)).length > 0 ? 'Critique' : 'OK', 
      color: 'text-nexus-danger',
      bg: 'bg-nexus-danger/10'
    },
  ];

  const logisticsIncidents = orderHistory
    .filter(h => ['DELIVERY_FAILED', 'CANCELLED_BY_SELLER'].includes(h.newStatus))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .slice(0, 5);

  const cashToCollect = orders
    .filter(o => o.status === 'SHIPPED' && o.paymentMethod === 'CASH')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const balanceMomo = orders
    .filter(o => o.paymentMethod === 'MOMO' && o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.total || 0), 0);
    
  const balanceOrange = orders
    .filter(o => o.paymentMethod === 'OM' && o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const stars = [...products]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 3);


  const advantages = [
    { 
      title: 'Vision Globale', 
      desc: 'Connectez tous vos services en un seul point de contrôle.', 
      img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800' 
    },
    { 
      title: 'Performance Temps Réel', 
      desc: 'Prenez des décisions basées sur des données instantanées.', 
      img: 'https://images.unsplash.com/photo-1551288049-bbda38656ad1?auto=format&fit=crop&q=80&w=800' 
    },
    { 
      title: 'Collaboration Intuitive', 
      desc: 'Fluidifiez les échanges entre vos équipes sur le terrain.', 
      img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800' 
    },
    { 
      title: 'Automatisation Intelligente', 
      desc: 'Réduisez vos erreurs et gagnez un temps précieux.', 
      img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800' 
    },
    { 
      title: 'Sécurité de Pointe', 
      desc: 'Vos données critiques protégées par un cryptage robuste.', 
      img: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800' 
    },
    { 
      title: 'Accessibilité Mobile', 
      desc: 'Gérez votre entreprise depuis n\'importe quel terminal.', 
      img: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=800' 
    },
  ];

  const categoryIcons: Record<string, any> = {
    'Construction': HardHat,
    'Céréales': Wheat,
    'Pièces détachées': Settings,
    'Informatique': Monitor,
    'Électroménager': Zap,
    'Bricolage': Hammer,
    'Bureau': Briefcase,
    'Divers': Package
  };

  const productCategories = Array.from(new Set(products.map(p => p.category)))
    .filter(Boolean)
    .sort((a, b) => {
      const aCount = products.filter(p => p.category === a).length;
      const bCount = products.filter(p => p.category === b).length;
      return bCount - aCount;
    });

  const navigateTo = (tab: string) => {
    window.dispatchEvent(new CustomEvent('NAVIGATE_TAB', { detail: tab }));
  };

  const quickActions = [
    { label: 'Ventes', tab: 'sales', icon: TrendingUp, color: 'text-nexus-success', bg: 'bg-nexus-success/10' },
    { label: 'Projets', tab: 'projects', icon: FolderKanban, color: 'text-nexus-accent', bg: 'bg-nexus-accent/10' },
    { label: 'Personnel', tab: 'personnel', icon: Briefcase, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
    { label: 'Stocks', tab: 'resources', icon: Package, color: 'text-nexus-warning', bg: 'bg-nexus-warning/10' },
  ];

  return (
    <div className="space-y-10 pb-20">
      {/* Immersive Command Header */}
      <div className="relative overflow-hidden bg-nexus-surface rounded-[2rem] lg:rounded-[2.5rem] p-6 lg:p-12 text-nexus-text shadow-2xl border border-white/5 group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-nexus-bg to-nexus-bg z-0 opacity-80" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-nexus-accent/5 rounded-full blur-[120px] -mr-48 -mt-48 transition-transform duration-1000 group-hover:scale-110" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12">
          <div className="max-w-xl">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full mb-6">
                <div className="w-2 h-2 bg-nexus-accent rounded-full shadow-[0_0_8px_rgba(91,140,255,0.6)] animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-nexus-accent">Nexus OS • Cockpit Intelligence</span>
              </div>
              <h1 className="text-3xl lg:text-5xl font-black tracking-tight mb-4 leading-tight">
                Bonjour, <span className="nexus-gradient-text">{user?.displayName || user?.email?.split('@')[0]}</span>
              </h1>
              <p className="text-nexus-text-muted text-xs lg:text-sm font-medium leading-relaxed max-w-md italic">
                {currentCompany?.name} • Analyse prédictive en cours...
              </p>
            </motion.div>
          </div>
          
          <div className="flex flex-wrap gap-4 shrink-0 bg-white/5 backdrop-blur-md p-2 rounded-[2rem] border border-white/10">
             {(!isNewEnterprise || role === 'owner') && (
              <>
                <button 
                  onClick={() => document.getElementById('import-json')?.click()}
                  disabled={isImporting || isExporting}
                  className="px-6 py-4 rounded-2xl text-nexus-text text-[9px] font-black uppercase tracking-[0.15em] hover:bg-white/5 transition-all flex items-center gap-3 group/btn"
                >
                  <Upload size={14} className="group-hover:-translate-y-1 transition-transform" />
                  {isImporting ? 'Chargement...' : 'Importation'}
                </button>
                <input type="file" accept=".json" id="import-json" hidden onChange={handleImport} />
                
                <button 
                  onClick={() => window.print()}
                  className="px-6 py-4 rounded-2xl bg-white text-nexus-bg text-[9px] font-black uppercase tracking-[0.15em] hover:bg-blue-50 transition-all shadow-xl flex items-center gap-3 active:scale-95"
                >
                  <BarChart3 size={14} />
                  Rapport PDF
                </button>
                
                <button 
                  onClick={handleExport}
                  disabled={isExporting || isImporting}
                  className="px-6 py-4 rounded-2xl bg-nexus-accent text-white text-[9px] font-black uppercase tracking-[0.15em] hover:bg-blue-500 transition-all shadow-[0_15px_30px_rgba(91,140,255,0.2)] flex items-center gap-3"
                >
                  <Download size={14} />
                  {isExporting ? 'Process...' : 'Exportation'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Access Cockpit */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action, idx) => (
          <motion.button 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => navigateTo(action.tab)}
            className="flex flex-col items-center justify-center p-8 bg-nexus-surface border border-white/5 rounded-[2.5rem] hover:border-nexus-accent/50 hover:shadow-2xl hover:shadow-nexus-accent/5 transition-all group active:scale-95"
          >
            <div className={`w-16 h-16 ${action.bg} ${action.color} rounded-3xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <action.icon size={32} />
            </div>
            <span className="text-[11px] font-black text-nexus-text-muted uppercase tracking-widest group-hover:text-nexus-text transition-colors">{action.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Main Bento Grid */}
      {isEmptyState ? (
        <div className="grid grid-cols-12 gap-8">
          {/* Onboarding Guide - Spans 12 cols */}
          <div className="col-span-12 bg-nexus-surface rounded-[2.5rem] p-10 border-2 border-dashed border-white/10 flex flex-col items-center text-center group hover:border-nexus-accent/30 transition-all">
            <div className="w-20 h-20 bg-nexus-accent/10 rounded-3xl flex items-center justify-center text-nexus-accent mb-8 animate-bounce transition-transform group-hover:scale-110">
              <Plus size={40} />
            </div>
            <h2 className="text-3xl font-black text-nexus-text uppercase tracking-tight mb-4 italic">Lancez votre symphonie Nexus</h2>
            <p className="text-nexus-text-muted max-w-lg font-medium leading-relaxed mb-10">
              Votre tableau de bord est activé. Suivez ces <span className="text-nexus-accent font-bold">3 protocoles</span> pour initialiser l'écosystème.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
              {[
                { 
                  step: '01', 
                  title: 'Stocks & Logistique', 
                  desc: 'Importez votre catalogue pour activer les algorithmes de vente.',
                  tab: 'resources',
                  icon: Package
                },
                { 
                  step: '02', 
                  title: 'Force de Vente', 
                  desc: 'Enregistrez vos agents pour déléguer la performance terrain.',
                  tab: 'personnel',
                  icon: Users
                },
                { 
                  step: '03', 
                  title: 'Configuration Flux', 
                  desc: 'Validation des services et des protocoles de paiement.',
                  tab: 'sales',
                  icon: Settings
                }
              ].map((s) => (
                <button 
                  key={s.step}
                  onClick={() => window.dispatchEvent(new CustomEvent('NAVIGATE_TAB', { detail: s.tab }))}
                  className="bg-white/5 p-8 rounded-3xl border border-white/5 hover:bg-nexus-accent hover:text-white transition-all text-left flex flex-col h-full group/card"
                >
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-black text-nexus-accent bg-nexus-accent/10 px-2 py-1 rounded group-hover/card:bg-white group-hover/card:text-nexus-accent">{s.step}</span>
                    <s.icon size={20} className="text-nexus-text-muted group-hover/card:text-white" />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight mb-2">{s.title}</h3>
                  <p className="text-[11px] font-medium opacity-60 leading-relaxed mb-6 flex-1">{s.desc}</p>
                  <div className="flex items-center gap-2 text-nexus-accent group-hover/card:text-white text-[9px] font-black uppercase tracking-widest">
                    Activation <ArrowLeft size={12} className="rotate-180" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Flux Balance Placeholder */}
          <div className="col-span-12 lg:col-span-6 bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden flex flex-col justify-center items-center text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
            <Activity size={48} className="text-emerald-400 mb-6 opacity-40" />
            <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Balance des Flux</h3>
            <p className="text-slate-400 text-xs font-medium max-w-xs">
              Une fois vos premières ventes effectuées, vous visualiserez ici l'équilibre entre vos entrées et sorties de marchandises.
            </p>
          </div>

          {/* Performance Placeholder */}
          <div className="col-span-12 lg:col-span-6 bg-white rounded-[2.5rem] p-10 border border-slate-100 flex flex-col justify-center items-center text-center">
             <div className="w-full h-32 flex items-end gap-2 mb-8 px-10">
               {[20, 40, 15, 50, 30, 45, 25].map((v, i) => (
                 <div key={i} className="flex-1 bg-slate-50 rounded-t-lg transition-all animate-pulse" style={{ height: `${v}%` }} />
               ))}
             </div>
             <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2">Insights Prédictifs</h3>
             <p className="text-slate-400 text-xs font-medium max-w-xs">
               Nexus AI analysera vos performances après 7 jours d'activité pour vous suggérer des optimisations de stock.
             </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-8">
        
        {/* KPI Row - Top 4 cards */}
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="col-span-12 md:col-span-6 lg:col-span-3 bg-nexus-surface p-7 rounded-[2rem] border border-white/5 shadow-2xl hover:border-nexus-accent/30 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                stat.bg, stat.color
              )}>
                <stat.icon size={20} />
              </div>
              <div className={cn(
                "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                stat.trend === 'Critique' ? 'bg-nexus-danger/20 text-nexus-danger' : 'bg-nexus-accent/10 text-nexus-accent'
              )}>
                {stat.trend}
              </div>
            </div>
            <p className="text-[9px] font-black text-nexus-text-muted uppercase tracking-[0.2em] mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-nexus-text leading-none">{stat.value}</h3>
          </motion.div>
        ))}

        {/* Top Categories Row */}
        <div className="col-span-12">
          <div className="bg-nexus-surface rounded-[2.5rem] p-8 border border-white/5 shadow-2xl overflow-hidden relative group">
             <div className="absolute top-0 right-0 w-64 h-64 bg-nexus-accent/5 rounded-full blur-3xl opacity-50 -mr-32 -mt-32" />
             <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                   <h2 className="text-xl font-black italic uppercase tracking-tight text-nexus-text">Rayons Stratégiques</h2>
                   <p className="text-[9px] font-bold text-nexus-text-muted uppercase tracking-[0.2em] mt-1">Analyse des actifs circulants</p>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 md:pb-0 scrollbar-hide max-w-full">
                   {productCategories.map((cat) => {
                      const Icon = categoryIcons[cat] || Package;
                      const count = products.filter(p => p.category === cat).length;
                      return (
                         <div key={cat} className="flex items-center gap-4 bg-white/5 px-6 py-4 rounded-3xl border border-white/5 shrink-0 group/cat hover:bg-nexus-accent hover:text-white transition-all cursor-default">
                            <div className="w-10 h-10 bg-nexus-bg rounded-xl flex items-center justify-center text-nexus-text-muted shadow-sm group-hover/cat:bg-white/10 group-hover/cat:text-white transition-colors">
                               <Icon size={18} />
                            </div>
                            <div>
                               <p className="text-[10px] font-black uppercase tracking-widest">{cat}</p>
                               <p className="text-[8px] font-bold opacity-60 uppercase">{count} Actifs</p>
                            </div>
                         </div>
                      );
                   })}
                </div>
             </div>
          </div>
        </div>

        {/* Operational Guide Quick Link */}
        <div className="col-span-12 bg-nexus-accent rounded-[2rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-blue-900/20 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-110" />
           <div className="flex items-center gap-6 relative z-10">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md border border-white/20">
                 <BookOpen size={32} className="text-white" />
              </div>
              <div>
                 <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-1">Nexus Intelligence Briefing</h2>
                 <p className="text-blue-100 text-xs font-medium max-w-lg">
                   Consultez vos statistiques prédictives et protocoles de performance pour Maroua.
                 </p>
              </div>
           </div>
           <button 
             onClick={() => navigateTo('guide')}
             className="relative z-10 px-8 py-4 bg-white text-nexus-accent rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-blue-50 transition-colors active:scale-95"
           >
              Accéder au Briefing
           </button>
        </div>

        {/* Intelligence Hub (Chart) - Spans 8 cols */}
        <div className="col-span-12 xl:col-span-8 bg-nexus-surface rounded-[2.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-nexus-accent/5 rounded-full blur-3xl opacity-30 -mr-32 -mt-32 scale-0 group-hover:scale-100 transition-transform duration-1000" />
          
          <div className="flex justify-between items-center mb-10 relative z-10">
            <div>
              <h3 className="text-xl font-black text-nexus-text uppercase tracking-tight">Intelligence Flux</h3>
              <p className="text-[9px] font-bold text-nexus-text-muted uppercase tracking-[0.2em] mt-1">Analyse du CA prédictif</p>
            </div>
            <div className="flex gap-2">
              {['24h', '7j', '30j'].map((t, i) => (
                <button key={t} className={cn(
                  "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                  i === 2 ? "bg-nexus-accent text-white shadow-lg" : "text-nexus-text-muted hover:bg-white/5"
                )}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[280px] flex items-end gap-3.5 relative z-10">
            {Array.from({ length: 12 }).map((_, i) => {
              const val = orders.filter(o => {
                const d = o.date?.toDate ? o.date.toDate() : new Date(o.date);
                return d.getMonth() === i;
              }).reduce((sum, o) => sum + (o.total || 0), 0) / 1000;
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group/bar">
                  <div 
                    style={{ height: `${Math.max(val, 5)}%` }}
                    className={cn(
                      "w-full rounded-t-lg transition-all relative",
                      i === new Date().getMonth() ? "bg-nexus-accent shadow-[0_0_15px_rgba(91,140,255,0.4)]" : "bg-white/5 group-hover/bar:bg-white/10"
                    )}
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-nexus-bg text-white text-[8px] font-black px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 whitespace-nowrap border border-white/10">
                      {Math.round(val)}k
                    </div>
                  </div>
                  <span className="text-[8px] font-black text-nexus-text-muted uppercase tracking-[0.2em]">{i + 1}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Flow Tracker */}
        <div className="col-span-12 xl:col-span-4 bg-slate-900 rounded-3xl lg:rounded-[2.5rem] p-7 lg:p-9 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/40 via-transparent to-transparent z-0 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <DollarSign size={20} />
              </div>
              <div>
                <h3 className="text-md font-black uppercase tracking-wider">Trésorerie Digitale</h3>
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Réconciliation Actuelle</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {[
                { label: 'Solde MoMo (Simulé)', val: `${balanceMomo.toLocaleString()} FCFA`, color: 'bg-violet-500' },
                { label: 'Solde Orange Money', val: `${balanceOrange.toLocaleString()} FCFA`, color: 'bg-orange-500' },
                { label: 'Fonds de Caisse / Cash', val: `${cashToCollect.toLocaleString()} FCFA`, color: 'bg-emerald-500' },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{s.label}</span>
                    <span className="text-[11px] font-black text-white">{s.val}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full w-full opacity-50", s.color)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md relative z-10">
             <div className="flex items-center gap-2 mb-2">
               <Truck size={14} className="text-blue-400" />
               <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Collecte Terrain</span>
             </div>
             <p className="text-[11px] font-medium text-slate-300 leading-relaxed italic">
               "{orders.filter(o => o.status === 'SHIPPED' && o.paymentMethod === 'CASH').length} livreurs sont en route avec des encaissements espèces."
             </p>
          </div>
        </div>

        {/* Logistics Tracking Center */}
        <div className="col-span-12 xl:col-span-8 space-y-6">
          <div className="bg-nexus-surface rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
               <div>
                  <h3 className="text-xl font-black text-nexus-text uppercase">Logistics Cockpit</h3>
                  <p className="text-[10px] font-black text-nexus-text-muted uppercase tracking-widest mt-1">Alertes et incidents terrain</p>
               </div>
               <div className="p-3 bg-nexus-danger/10 text-nexus-danger rounded-2xl">
                 <AlertTriangle size={24} />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {logisticsIncidents.length > 0 ? logisticsIncidents.map((incident, idx) => (
                <div key={idx} className={cn(
                  "p-5 rounded-3xl border flex flex-col justify-between gap-4 transition-all hover:scale-[1.02]",
                  incident.newStatus === 'DELIVERY_FAILED' ? "bg-nexus-warning/5 border-nexus-warning/20" : "bg-nexus-danger/5 border-nexus-danger/20"
                )}>
                  <div className="flex justify-between items-start">
                    <div className={cn(
                        "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                        incident.newStatus === 'DELIVERY_FAILED' ? "bg-nexus-warning/20 text-nexus-warning" : "bg-nexus-danger/20 text-nexus-danger"
                      )}>
                      {incident.newStatus === 'DELIVERY_FAILED' ? 'Échec livraison' : 'Annulation'}
                    </div>
                    <span className="text-[9px] font-bold text-nexus-text-muted">
                      #{incident.orderId.slice(0, 6)}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs font-black text-nexus-text uppercase italic">"{incident.reason}"</p>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 py-2 bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-nexus-text-muted border border-white/5 hover:bg-white/10 transition-all">
                      Logs
                    </button>
                    <button className="flex-1 py-2 bg-nexus-accent rounded-xl text-[9px] font-black uppercase tracking-widest text-white shadow-lg hover:bg-blue-500 transition-all">
                      Rectifier
                    </button>
                  </div>
                </div>
              )) : (
                <div className="col-span-2 py-12 text-center">
                   <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-nexus-text-muted opacity-20">
                      <Truck size={32} />
                   </div>
                   <p className="text-xs font-bold text-nexus-text-muted uppercase tracking-widest italic leading-relaxed">Intelligence Logistique Optimale : Aucun incident critique détecté sur vos flux actuels.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Marketplace Intelligence */}
        <div className="col-span-12 xl:col-span-4 bg-nexus-surface rounded-[2.5rem] p-8 border border-white/5 shadow-2xl flex flex-col">
           <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black text-nexus-text uppercase">Market Intelligence</h3>
                <p className="text-[10px] font-black text-nexus-text-muted uppercase tracking-widest mt-1">Comportement consommateurs</p>
              </div>
              <div className="p-3 bg-nexus-accent/10 text-nexus-accent rounded-2xl">
                <Zap size={24} />
              </div>
           </div>

           <div className="space-y-6 flex-1">
              <div>
                <p className="text-[9px] font-black text-nexus-text-muted uppercase tracking-widest mb-4">Top Actifs (Popularité)</p>
                <div className="space-y-4">
                   {stars.map((p, i) => (
                     <div key={p.id} className="flex items-center gap-4 group/star hover:translate-x-1 transition-transform">
                        <div className="w-10 h-10 rounded-xl bg-nexus-bg border border-white/10 flex items-center justify-center text-nexus-text font-black text-xs group-hover/star:bg-nexus-accent group-hover/star:text-white transition-colors">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-black text-nexus-text uppercase tracking-tight truncate">{p.name}</p>
                          <p className="text-[9px] font-bold text-nexus-text-muted">{p.views || 0} analyses</p>
                        </div>
                        <div className="text-xs font-black text-nexus-accent">
                           {p.price.toLocaleString()}
                        </div>
                     </div>
                   ))}
                </div>
              </div>
           </div>
        </div>
      </div>

      )}

      {/* Simplified Advantages with ERP Benefits */}
      <div className="py-12 bg-slate-50 border-y border-slate-100">
        <div className="text-center mb-12">
          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Performance NEXUS ERP</h2>
          <div className="w-12 h-1 bg-blue-600 rounded-full mx-auto mt-3" />
        </div>

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {advantages.map((adv, i) => (
            <div 
              key={i} 
              className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 mb-4 font-black text-xs">
                0{i + 1}
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2 uppercase tracking-tight">{adv.title}</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">{adv.desc}</p>
            </div>
          ))}
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

