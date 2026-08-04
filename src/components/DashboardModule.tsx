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
import { changeTaskStatus, collectTaskRecipients, createTaskWithTracking, taskStatusBadge, taskStatusLabel, TASK_STATUS_ORDER } from '../lib/taskTracking';

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
  const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: '', priority: 'medium', startDate: '', endDate: '', needs: '', constraints: '' });
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
    if (!currentCompany || !newTask.title) return;
    try {
      const assignee = personnel.find(p => p.id === newTask.assignedTo);
      const recipients = collectTaskRecipients({
        employees: currentCompany.employees,
        ownerId: currentCompany.ownerId,
        assigneeUid: assignee?.uid,
      });

      await createTaskWithTracking({
        companyId: currentCompany.id,
        data: {
          ...newTask,
          startDate: newTask.startDate || null,
          endDate: newTask.endDate || null,
          dueDate: newTask.endDate || null,
          projectId: null,
        },
        actor: { id: user?.uid, name: user?.displayName || user?.email },
        recipients,
      });

      setIsAddingTask(false);
      setNewTask({ title: '', description: '', assignedTo: '', priority: 'medium', startDate: '', endDate: '', needs: '', constraints: '' });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'tasks');
    }
  };

  const handleChangeTaskStatus = async (task: any, toStatus: string) => {
    if (!currentCompany || task.status === toStatus) return;
    try {
      const assignee = personnel.find(p => p.id === task.assignedTo);
      const recipients = collectTaskRecipients({
        employees: currentCompany.employees,
        ownerId: currentCompany.ownerId,
        assigneeUid: assignee?.uid,
      });
      await changeTaskStatus({
        companyId: currentCompany.id,
        taskId: task.id,
        taskTitle: task.title,
        fromStatus: task.status,
        toStatus,
        actor: { id: user?.uid, name: user?.displayName || user?.email },
        recipients,
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'tasks');
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

  const goToTasks = () => {
    window.history.pushState(null, '', '#projects/tasks');
    window.dispatchEvent(new CustomEvent('NAVIGATE_TAB', { detail: 'projects' }));
  };

  const quickActions = [
    { label: 'Ventes', tab: 'sales', icon: TrendingUp, color: 'text-nexus-success', bg: 'bg-nexus-success/10' },
    { label: 'Projets', tab: 'projects', icon: FolderKanban, color: 'text-nexus-accent', bg: 'bg-nexus-accent/10' },
    { label: 'Personnel', tab: 'personnel', icon: Briefcase, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
    { label: 'Stocks', tab: 'resources', icon: Package, color: 'text-nexus-warning', bg: 'bg-nexus-warning/10' },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="relative overflow-hidden bg-white rounded-[1.5rem] p-6 text-slate-900 shadow-sm border border-slate-100 group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-white z-0" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[80px] -mr-48 -mt-48 transition-transform duration-1000 group-hover:scale-110" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="max-w-xl">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full mb-4 shadow-sm">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nexus OS • Cockpit Intelligence</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight mb-2 leading-tight">
                Bonjour, <span className="text-blue-600">{user?.displayName || user?.email?.split('@')[0]}</span>
              </h1>
              <p className="text-slate-500 text-xs font-medium leading-relaxed italic">
                {currentCompany?.name} • Analyse en cours...
              </p>
            </motion.div>
          </div>
          
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => { setNewTask({ title: '', description: '', assignedTo: '', priority: 'medium', startDate: '', endDate: '', needs: '', constraints: '' }); setIsAddingTask(true); }}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white border border-transparent text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md flex items-center gap-2 active:scale-95"
            >
              <Plus size={14} />
              Nouvelle Tâche
            </button>
             {(!isNewEnterprise || role === 'owner') && (
              <>
                <button 
                  onClick={() => document.getElementById('import-json')?.click()}
                  disabled={isImporting || isExporting}
                  className="px-4 py-2 rounded-xl text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 border border-slate-200 transition-all flex items-center gap-2 active:scale-95 bg-white shadow-sm"
                >
                  <Upload size={14} />
                  {isImporting ? '...' : 'Import'}
                </button>
                <input type="file" accept=".json" id="import-json" hidden onChange={handleImport} />
                
                <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-white text-slate-900 border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 active:scale-95"
                >
                  <BarChart3 size={14} />
                  PDF
                </button>
                
                <button 
                  onClick={handleExport}
                  disabled={isExporting || isImporting}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white border border-transparent text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md flex items-center gap-2 active:scale-95"
                >
                  <Download size={14} />
                  {isExporting ? '...' : 'Export'}
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => navigateTo(action.tab)}
            className="flex flex-col items-center justify-center p-5 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5 transition-all group active:scale-95"
          >
            <div className={`w-12 h-12 ${action.bg} ${action.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <action.icon size={24} />
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-900 transition-colors">{action.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Tasks & Evolutions */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <Activity size={16} className="text-blue-600" />
            Tâches & Évolutions
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{tasks.length}</span>
          </h3>
          <button onClick={goToTasks} className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-all">Tout voir →</button>
        </div>
        {tasks.filter(t => t.status === 'blocked').length > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-xl border border-red-100 bg-red-50/60 mb-3">
            <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-[11px] font-bold text-red-600">
              {tasks.filter(t => t.status === 'blocked').length} tâche{tasks.filter(t => t.status === 'blocked').length > 1 ? 's' : ''} bloquée{tasks.filter(t => t.status === 'blocked').length > 1 ? 's' : ''} à débloquer
            </p>
          </div>
        )}
        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.slice(0, 5).map(t => {
              const assignee = personnel.find(p => p.id === t.assignedTo);
              return (
                <div key={t.id} className={cn(
                  "flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all",
                  t.status === 'blocked' && "border-red-200 bg-red-50/50"
                )}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 truncate">{t.title}</span>
                      <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0", taskStatusBadge(t.status))}>
                        {taskStatusLabel(t.status)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {assignee ? `Assigné à ${assignee.name}` : 'Non assigné'}
                      {t.endDate ? ` • Échéance ${new Date(t.endDate.seconds ? t.endDate.seconds * 1000 : t.endDate).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  {t.status !== 'done' && (
                    <select
                      value={t.status}
                      onChange={e => handleChangeTaskStatus(t, e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-600 outline-none focus:border-blue-400 shrink-0"
                    >
                      {TASK_STATUS_ORDER.map(s => <option key={s} value={s}>{taskStatusLabel(s)}</option>)}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-slate-50 border border-dashed border-slate-200">
            <p className="text-[11px] text-slate-400 italic">Aucune tâche en cours. Lancez-vous !</p>
            <button
              onClick={() => { setNewTask({ title: '', description: '', assignedTo: '', priority: 'medium', startDate: '', endDate: '', needs: '', constraints: '' }); setIsAddingTask(true); }}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2"
            >
              <Plus size={14} />
              Créer une tâche
            </button>
          </div>
        )}
      </div>

      {/* Main Bento Grid */}
      {isEmptyState ? (
        <div className="grid grid-cols-12 gap-6">
          {/* Onboarding Guide - Spans 12 cols */}
          <div className="col-span-12 bg-white rounded-2xl p-8 border-2 border-dashed border-blue-500/20 flex flex-col items-center text-center group hover:border-blue-500/40 transition-all shadow-sm">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 animate-bounce transition-transform group-hover:scale-110">
              <Plus size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-3">Initialisation de l'espace</h2>
            <p className="text-slate-500 max-w-lg font-medium leading-relaxed mb-8 text-sm">
              Votre tableau de bord est prêt. Suivez ces <span className="text-blue-600 font-bold">3 étapes</span> pour configurer votre environnement.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-5xl">
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
                  className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:bg-blue-600 hover:text-white transition-all text-left flex flex-col h-full group/card"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-blue-600 bg-white px-2 py-1 rounded shadow-sm group-hover/card:text-blue-600">{s.step}</span>
                    <s.icon size={20} className="text-slate-400 group-hover/card:text-white" />
                  </div>
                  <h3 className="text-md font-black uppercase tracking-tight mb-2 text-slate-900 group-hover/card:text-white">{s.title}</h3>
                  <p className="text-xs font-medium text-slate-500 group-hover/card:text-blue-100 leading-relaxed mb-4 flex-1">{s.desc}</p>
                  <div className="flex items-center gap-2 text-blue-600 group-hover/card:text-white text-[9px] font-black uppercase tracking-widest">
                    Activation <ArrowLeft size={12} className="rotate-180" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Flux Balance Placeholder */}
          <div className="col-span-12 lg:col-span-6 bg-slate-50 rounded-2xl p-8 text-slate-900 relative overflow-hidden flex flex-col justify-center items-center text-center border border-slate-100">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-100 rounded-full blur-3xl -mr-24 -mt-24 opacity-50" />
            <Activity size={40} className="text-emerald-500 mb-4 opacity-50" />
            <h3 className="text-xl font-black uppercase tracking-tight mb-2">Balance des Flux</h3>
            <p className="text-slate-500 text-xs font-medium max-w-xs">
              Une fois vos premières ventes effectuées, vous visualiserez ici l'équilibre entre vos entrées et sorties de marchandises.
            </p>
          </div>

          {/* Performance Placeholder */}
          <div className="col-span-12 lg:col-span-6 bg-white rounded-2xl p-8 border border-slate-100 flex flex-col justify-center items-center text-center shadow-sm">
             <div className="w-full h-24 flex items-end gap-2 mb-6 px-10">
               {[20, 40, 15, 50, 30, 45, 25].map((v, i) => (
                 <div key={i} className="flex-1 bg-slate-100 rounded-t-lg transition-all animate-pulse" style={{ height: `${v}%` }} />
               ))}
             </div>
             <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-2">Insights Prédictifs</h3>
             <p className="text-slate-500 text-xs font-medium max-w-xs">
               Nexus AI analysera vos performances après 7 jours d'activité pour vous suggérer des optimisations de stock.
             </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
        
        {/* KPI Row - Top 4 cards */}
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                stat.bg, stat.color
              )}>
                <stat.icon size={18} />
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest",
                stat.trend === 'Critique' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
              )}>
                {stat.trend}
              </div>
            </div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-xl font-black text-slate-900 leading-none">{stat.value}</h3>
          </motion.div>
        ))}

        {/* Top Categories Row */}
        <div className="col-span-12">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm overflow-hidden relative group">
             <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50 rounded-full blur-3xl opacity-50 -mr-24 -mt-24" />
             <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                   <h2 className="text-lg font-black text-slate-900 uppercase">Rayons Stratégiques</h2>
                   <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Analyse des actifs circulants</p>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide max-w-full">
                   {productCategories.map((cat) => {
                      const Icon = categoryIcons[cat] || Package;
                      const count = products.filter(p => p.category === cat).length;
                      return (
                         <div key={cat} className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 shrink-0 group/cat hover:bg-blue-50 transition-all cursor-default">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 group-hover/cat:text-blue-600 transition-colors shadow-sm">
                               <Icon size={16} />
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{cat}</p>
                               <p className="text-[8px] font-bold text-slate-500 uppercase">{count} Actifs</p>
                            </div>
                         </div>
                      );
                   })}
                </div>
             </div>
          </div>
        </div>

        {/* Intelligence Hub (Chart) - Spans 8 cols */}
        <div className="col-span-12 xl:col-span-8 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase">Intelligence Flux</h3>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Analyse du CA prédictif</p>
            </div>
            <div className="flex gap-2">
              {['24h', '7j', '30j'].map((t, i) => (
                <button key={t} className={cn(
                  "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  i === 2 ? "bg-blue-600 text-white shadow-sm" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                )}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[200px] flex items-end gap-2 relative z-10">
            {Array.from({ length: 12 }).map((_, i) => {
              const val = orders.filter(o => {
                const d = o.date?.toDate ? o.date.toDate() : new Date(o.date);
                return d.getMonth() === i;
              }).reduce((sum, o) => sum + (o.total || 0), 0) / 1000;
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group/bar">
                  <div 
                    style={{ height: `${Math.max(val, 5)}%` }}
                    className={cn(
                      "w-full rounded-t-md transition-all relative",
                      i === new Date().getMonth() ? "bg-blue-500" : "bg-slate-100 group-hover/bar:bg-blue-200"
                    )}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 whitespace-nowrap">
                      {Math.round(val)}k
                    </div>
                  </div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{i + 1}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Flow Tracker */}
        <div className="col-span-12 xl:col-span-4 bg-white rounded-2xl p-6 text-slate-900 shadow-sm relative overflow-hidden flex flex-col justify-between border border-slate-100">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <DollarSign size={20} />
              </div>
              <div>
                <h3 className="text-md font-black uppercase text-slate-900">Trésorerie Digitale</h3>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Réconciliation Actuelle</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {[
                { label: 'Solde MoMo (Simulé)', val: `${balanceMomo.toLocaleString()} FCFA`, color: 'bg-violet-500' },
                { label: 'Solde Orange Money', val: `${balanceOrange.toLocaleString()} FCFA`, color: 'bg-orange-500' },
                { label: 'Fonds de Caisse / Cash', val: `${cashToCollect.toLocaleString()} FCFA`, color: 'bg-emerald-500' },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{s.label}</span>
                    <span className="text-[10px] font-black text-slate-900">{s.val}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full w-full", s.color)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-100 relative z-10">
             <div className="flex items-center gap-2 mb-1.5">
               <Truck size={14} className="text-blue-500" />
               <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Collecte Terrain</span>
             </div>
             <p className="text-[10px] font-medium text-slate-500 leading-relaxed italic">
               "{orders.filter(o => o.status === 'SHIPPED' && o.paymentMethod === 'CASH').length} livreurs sont en route avec des encaissements."
             </p>
          </div>
        </div>

        {/* Logistics Tracking Center */}
        <div className="col-span-12 xl:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
               <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase">Logistics Cockpit</h3>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Alertes et incidents terrain</p>
               </div>
               <div className="p-2.5 bg-red-50 text-red-500 rounded-xl">
                 <AlertTriangle size={20} />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
              {logisticsIncidents.length > 0 ? logisticsIncidents.map((incident, idx) => (
                <div key={idx} className={cn(
                  "p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all bg-white",
                  incident.newStatus === 'DELIVERY_FAILED' ? "border-orange-200 shadow-sm shadow-orange-100/50" : "border-red-200 shadow-sm shadow-red-100/50"
                )}>
                  <div className="flex justify-between items-start">
                    <div className={cn(
                        "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                        incident.newStatus === 'DELIVERY_FAILED' ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"
                      )}>
                      {incident.newStatus === 'DELIVERY_FAILED' ? 'Échec livraison' : 'Annulation'}
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">
                      #{incident.orderId.slice(0, 6)}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700 italic">"{incident.reason}"</p>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 py-1.5 bg-slate-50 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 hover:bg-slate-100 transition-all">
                      Logs
                    </button>
                    <button className="flex-1 py-1.5 bg-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-sm hover:bg-blue-700 transition-all">
                      Action
                    </button>
                  </div>
                </div>
              )) : (
                <div className="col-span-2 py-8 text-center flex flex-col items-center justify-center">
                   <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 text-slate-300">
                      <CheckCircle2 size={24} />
                   </div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Aucun incident critique récent.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Marketplace Intelligence */}
        <div className="col-span-12 xl:col-span-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
           <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase">Top Produits</h3>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Demande en temps réel</p>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Zap size={20} />
              </div>
           </div>

           <div className="flex-1 space-y-4">
              {stars.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 group/star hover:translate-x-1 transition-transform">
                   <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 font-black text-xs group-hover/star:bg-blue-600 group-hover/star:text-white transition-colors">
                     {i + 1}
                   </div>
                   <div className="flex-1 overflow-hidden">
                     <p className="text-xs font-black text-slate-900 uppercase truncate">{p.name}</p>
                     <p className="text-[9px] font-bold text-slate-500">{p.views || 0} vues</p>
                   </div>
                   <div className="text-[10px] font-black text-blue-600">
                      {p.price.toLocaleString()}
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      )}

      {/* Simplified Advantages with ERP Benefits */}
      <div className="py-12 bg-slate-50 border-y border-slate-100">
        <div className="text-center mb-10">
          <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">Performance NEXUS ERP</h2>
          <div className="w-8 h-1 bg-blue-600 rounded-full mx-auto mt-3" />
        </div>

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {advantages.map((adv, i) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -5 }}
              className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm group hover:border-blue-200 transition-colors"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 mb-4 font-black text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                0{i + 1}
              </div>
              <h3 className="text-md font-black text-slate-900 mb-2 uppercase tracking-tight">{adv.title}</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">{adv.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Cross-tenant Global Overview */}
      {companies.filter(c => c.ownerId === user?.uid || c.ownerEmail === user?.email).length > 0 && (
        <div className="mt-8 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Vue d'ensemble de vos opérations</h3>
              <p className="text-xs font-medium text-slate-500 mt-1">Status et performances des entités sous votre direction.</p>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Briefcase size={20} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {companies
              .filter(c => c.ownerId === user?.uid || c.ownerEmail === user?.email)
              .map(c => (
              <div key={c.id} className="p-5 border border-slate-100 rounded-xl flex flex-col gap-4 hover:border-blue-200 transition-colors bg-slate-50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 rounded-bl-full -mr-12 -mt-12 group-hover:bg-blue-200 transition-colors opacity-50" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-10 h-10 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:text-blue-600 transition-colors">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 leading-tight">{c.name}</h4>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{c.joinCode}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-auto relative z-10 pt-4 border-t border-slate-200">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Membres</span>
                    <span className="font-black text-slate-900">{Array.isArray(c.employees) ? c.employees.length : (c.memberEmails?.length || 1)}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Status</span>
                    <span className="font-black text-emerald-600 uppercase text-[10px]">Actif</span>
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
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none text-slate-900" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} required/>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Prix (ou vide si sur devis)</label>
                <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none text-slate-900" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Description</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none h-24 resize-none text-slate-900" value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} />
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
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none text-slate-900" value={newIntervention.client} onChange={e => setNewIntervention({...newIntervention, client: e.target.value})} required/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none text-slate-900" value={newIntervention.date} onChange={e => setNewIntervention({...newIntervention, date: e.target.value})} required/>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Message / Détails de l'intervention</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none h-24 resize-none text-slate-900" value={newIntervention.message} onChange={e => setNewIntervention({...newIntervention, message: e.target.value})} required/>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Statut</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none text-slate-900" value={newIntervention.status} onChange={e => setNewIntervention({...newIntervention, status: e.target.value})}>
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
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Nouvelle Tâche</h3>
            <form onSubmit={handleSaveTask} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Titre de la tâche</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none text-slate-900" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} required/>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Description</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none text-slate-900 h-16" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Assigné à</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none text-slate-900" value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}>
                    <option value="">Sélectionner...</option>
                    {personnel.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Priorité</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none text-slate-900" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}>
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Début</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none text-slate-900" value={newTask.startDate} onChange={e => setNewTask({...newTask, startDate: e.target.value})}/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Échéance</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none text-slate-900" value={newTask.endDate} onChange={e => setNewTask({...newTask, endDate: e.target.value})}/>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Besoins (ressources, matériel...)</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none text-slate-900" placeholder="e.g. 2 ouvriers, camion, 500 000 FCFA" value={newTask.needs} onChange={e => setNewTask({...newTask, needs: e.target.value})}/>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Contraintes (limites, dépendances...)</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-400 outline-none text-slate-900" placeholder="e.g. dépend du fournisseur X, budget plafonné" value={newTask.constraints} onChange={e => setNewTask({...newTask, constraints: e.target.value})}/>
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

