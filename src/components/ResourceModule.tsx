import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, auth, orderBy, limit } from '../lib/firebase';
import { db } from '../lib/firebase';
import { Plus, Search, Package, ShieldCheck, AlertTriangle, ArrowRightLeft, Edit2, Trash2, RefreshCw, TrendingUp, Activity, Smartphone, CheckCircle2, X } from 'lucide-react';
import Table, { TableRow } from './ui/Table';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { cn } from '../lib/utils';
import { useCompany } from '../lib/CompanyContext';
import { createNotification } from '../lib/notifications';

interface Resource {
  id: string;
  name: string;
  type: string;
  quantity: number;
  status: 'Available' | 'Low' | 'Out' | 'Assigned' | 'Maintenance';
  location: string;
  condition?: string;
  duration?: string;
  warranty?: string;
  price?: number;
}

export default function ResourceModule({ user }: { user: any }) {
  const { currentCompany } = useCompany();
  const [resources, setResources] = useState<Resource[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'ecommerce' | 'movements' | 'analytics'>('inventory');
  const [activeFilter, setActiveFilter] = useState('Tous les actifs');
  const [isAdding, setIsAdding] = useState(false);
  const [viewingResource, setViewingResource] = useState<Resource | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({ type: 'Stock', quantity: 0, status: 'Available', condition: '', duration: '', warranty: '', price: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) { // Limit to ~800KB for Firestore base64
        alert("L'image est trop volumineuse. Veuillez choisir une image de moins de 800 Ko.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const [isRestocking, setIsRestocking] = useState(false);
  const [restockData, setRestockData] = useState({ resourceId: '', quantity: 0, supplier: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [movementLogs, setMovementLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!currentCompany) return;
    const q = query(collection(db, 'resources'), where('companyId', '==', currentCompany.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource));
      setResources(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'resources');
    });
    return unsubscribe;
  }, [currentCompany]);

  useEffect(() => {
    if (!currentCompany || activeTab !== 'ecommerce') return;
    const q = query(collection(db, 'products'), where('companyId', '==', currentCompany.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });
    return unsubscribe;
  }, [currentCompany, activeTab]);

  useEffect(() => {
    if (!currentCompany || activeTab !== 'movements') return;
    const q = query(
      collection(db, 'resource_movements'), 
      where('companyId', '==', currentCompany.id),
      orderBy('date', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMovementLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'resource_movements');
    });
    return unsubscribe;
  }, [currentCompany, activeTab]);

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !formData.name || submitting) return;
    setSubmitting(true);
    try {
      const newQuantity = Number(formData.quantity);
      if (editingResource) {
        await updateDoc(doc(db, 'resources', editingResource.id), {
          ...formData,
          quantity: newQuantity,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'resources'), {
          ...formData,
          quantity: newQuantity,
          companyId: currentCompany.id,
          createdAt: serverTimestamp()
        });
      }

      if (newQuantity < 10) {
        const recipients = [...(currentCompany.employees || [])];
        if (currentCompany.ownerId && !recipients.includes(currentCompany.ownerId)) recipients.push(currentCompany.ownerId);

        await createNotification(
          currentCompany.id,
          recipients,
          'Alerte de Stock Faible',
          `Le niveau de stock pour "${formData.name}" est faible (${newQuantity} restants).`,
          'alert'
        );
      }

      setIsAdding(false);
      setEditingResource(null);
      setFormData({ type: 'Stock', quantity: 0, status: 'Available', condition: '', duration: '', warranty: '', price: 0 });
    } catch(err) {
      handleFirestoreError(err, editingResource ? OperationType.UPDATE : OperationType.WRITE, 'resources');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !restockData.resourceId || restockData.quantity <= 0 || submitting) return;
    setSubmitting(true);

    try {
      const resourceRef = doc(db, 'resources', restockData.resourceId);
      const resource = resources.find(r => r.id === restockData.resourceId);
      
      if (resource) {
        const newQuantity = resource.quantity + Number(restockData.quantity);
        await updateDoc(resourceRef, {
          quantity: newQuantity,
          status: newQuantity > 10 ? 'Available' : (newQuantity > 0 ? 'Low' : 'Out'),
          updatedAt: serverTimestamp()
        });

        // Log movement
        await addDoc(collection(db, 'resource_movements'), {
          companyId: currentCompany.id,
          resourceId: restockData.resourceId,
          resourceName: resource.name,
          type: 'IN',
          quantity: restockData.quantity,
          supplier: restockData.supplier,
          notes: restockData.notes,
          performedBy: auth.currentUser?.email || 'Système',
          date: serverTimestamp()
        });
      }

      setIsRestocking(false);
      setRestockData({ resourceId: '', quantity: 0, supplier: '', notes: '' });
    } catch(err) {
      handleFirestoreError(err, OperationType.WRITE, 'resource_movements');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!window.confirm('Confirmer la suppression de cet actif ?')) return;
    try {
      await deleteDoc(doc(db, 'resources', id));
    } catch(err) {
      handleFirestoreError(err, OperationType.DELETE, 'resources');
    }
  };

  const filteredResources = resources.filter(res => {
    const matchesSearch = (res.name && res.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (res.location && res.location.toLowerCase().includes(searchTerm.toLowerCase()));
    if (activeFilter === 'Tous les actifs') return matchesSearch;
    return matchesSearch && res.type === activeFilter;
  });

  const stats = {
    total: resources.length,
    available: resources.filter(r => r.status === 'Available').length,
    outOfStock: resources.filter(r => r.status === 'Out' || r.quantity === 0).length,
    lowStock: resources.filter(r => r.status === 'Low' || (r.quantity > 0 && r.quantity < 10)).length
  };

  const movementsStats = {
    totalIn: movementLogs.filter(m => m.type === 'IN').reduce((acc, m) => acc + Number(m.quantity), 0),
    totalOut: movementLogs.filter(m => m.type === 'OUT').reduce((acc, m) => acc + Number(m.quantity), 0),
  };

  const fluxBalance = movementsStats.totalIn - movementsStats.totalOut;
  const availabilityRate = stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0;
  const stockoutRate = stats.total > 0 ? Math.round((stats.outOfStock / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-nexus-accent rounded-[2rem] p-8 sm:p-12 text-white shadow-xl border border-nexus-border/30">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="max-w-xl">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
              Nexus <span className="text-blue-500">Resources</span>
            </h1>
            <p className="text-nexus-text-muted text-sm sm:text-lg font-medium leading-relaxed">
              Propulsez votre logistique vers l'avenir. Gestion de stock en temps réel et orchestration des flux critiques.
            </p>
          </div>
          <div className="flex bg-slate-950/40 p-1.5 rounded-2xl border border-nexus-border/50 shrink-0 overflow-x-auto scrollbar-hide max-w-full">
            {[
              { id: 'inventory', label: 'Inventaire', icon: Package },
              { id: 'ecommerce', label: 'E-commerce', icon: Smartphone },
              { id: 'movements', label: 'Historique', icon: RefreshCw },
              { id: 'analytics', label: 'Analytique', icon: TrendingUp }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 transition-all whitespace-nowrap", 
                  activeTab === tab.id 
                    ? "bg-nexus-accent text-white hover:bg-nexus-accent-hover shadow-lg hover:shadow-nexus-accent/20 text-white shadow-xl shadow-blue-600/20" 
                    : "text-nexus-text-muted hover:text-white hover:bg-slate-500/5 dark:bg-slate-500/5 dark:bg-white/5"
                )}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['Tous les actifs', 'Stock', 'Matériel', 'Logiciel', 'Véhicule'].map((filter) => (
          <button 
            key={filter} 
            onClick={() => setActiveFilter(filter)}
            className={cn(
              "shrink-0 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all whitespace-nowrap",
              activeFilter === filter ? "bg-nexus-surface text-nexus-text shadow-md" : "bg-nexus-surface border border-nexus-border/30 text-nexus-text-muted hover:text-nexus-text shadow-sm"
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      {activeTab === 'inventory' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="flex gap-4 p-2 bg-nexus-surface rounded-[2rem] shadow-sm border border-nexus-border/30">
              <div className="flex-1 bg-slate-500/5 dark:bg-slate-500/5 dark:bg-white/5/50 rounded-2xl px-4 py-3 flex items-center gap-3 border border-nexus-border/30 transition-all focus-within:border-blue-400 focus-within:bg-nexus-surface">
                <Search className="text-nexus-text-muted" size={18} />
                <input 
                  type="text" 
                  placeholder="Rechercher un actif..." 
                  className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-nexus-text-muted placeholder:text-nexus-text-muted"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={() => {
                  setEditingResource(null);
                  setFormData({ type: 'Stock', quantity: 0, status: 'Available', condition: '', duration: '', warranty: '', price: 0 });
                  setIsAdding(true);
                }}
                className="px-6 bg-nexus-accent text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-nexus-accent text-white hover:bg-nexus-accent-hover shadow-lg hover:shadow-nexus-accent/20 transition-all shadow-xl shadow-slate-200"
              >
                <Plus size={16} /> AJOUTER
              </button>
            </div>

            <Table headers={['Identifiant', 'Article', 'Catégorie', 'Stock', 'Zone', 'Status', 'Actions']}>
              {filteredResources.map((res) => (
                <TableRow key={res.id}>
                  <span className="font-mono text-[10px] text-nexus-text-muted">#RES-{res.id.slice(0, 4).toUpperCase()}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-500/5 dark:bg-slate-500/5 dark:bg-white/5 border border-nexus-border/30 rounded flex items-center justify-center">
                      <Package size={14} className="text-nexus-text-muted" />
                    </div>
                    <span className="font-bold text-nexus-text">{res.name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-nexus-text-muted/80 uppercase tracking-wide bg-slate-100 px-2.5 py-1 rounded">
                    {res.type}
                  </span>
                  <span className={cn(
                    "font-bold font-mono",
                    res.quantity < 10 ? "text-red-500" : "text-nexus-text"
                  )}>
                    {res.quantity}
                  </span>
                  <span className="text-nexus-text-muted/80 font-medium">{res.location}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      res.status === 'Available' ? "bg-green-500" : 
                      res.status === 'Low' ? "bg-amber-500" : "bg-red-500"
                    )} />
                    <span className="text-[10px] font-bold text-nexus-text-muted uppercase tracking-tight">{res.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setEditingResource(res);
                        setFormData(res);
                        setIsAdding(true);
                      }}
                      className="p-1 px-2 border rounded-md hover:bg-slate-500/5 dark:bg-slate-500/5 dark:bg-white/5 text-nexus-text-muted hover:text-blue-600 transition-all font-bold text-[9px] flex items-center gap-1 uppercase"
                    >
                      <Edit2 size={10} />
                    </button>
                    <button 
                      onClick={() => handleDeleteResource(res.id)} 
                      className="p-1 border border-red-50 rounded-md hover:bg-red-50 text-nexus-text-muted hover:text-red-600 transition-all"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </TableRow>
              ))}
            </Table>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <section className="bg-nexus-surface border border-nexus-border p-6 rounded-[2rem] shadow-sm">
              <h3 className="text-[10px] font-black text-nexus-text-muted uppercase tracking-[0.2em] mb-6">Nexus Supply Metrics</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-500/5 dark:bg-slate-500/5 dark:bg-white/5 rounded-2xl border border-nexus-border/30">
                    <p className="text-[9px] font-black text-nexus-text-muted uppercase tracking-[0.1em] mb-1">Disponibilité</p>
                    <p className="text-xl font-bold text-nexus-text">{availabilityRate}%</p>
                  </div>
                  <div className="p-4 bg-slate-500/5 dark:bg-slate-500/5 dark:bg-white/5 rounded-2xl border border-nexus-border/30">
                    <p className="text-[9px] font-black text-nexus-text-muted uppercase tracking-[0.1em] mb-1">Ruptures</p>
                    <p className="text-xl font-bold text-red-600">{stockoutRate}%</p>
                  </div>
                </div>
                
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
                   <AlertTriangle className="text-amber-600 shrink-0" size={18} />
                   <div>
                     <p className="text-[10px] font-black text-amber-800 uppercase mb-1">Alertes Critiques</p>
                     <p className="text-[10px] text-amber-700 font-medium">{stats.lowStock} articles nécessitent une attention immédiate.</p>
                   </div>
                </div>
              </div>
            </section>

            <section className="bg-nexus-accent text-white hover:bg-nexus-accent-hover shadow-lg hover:shadow-nexus-accent/20 text-white p-8 rounded-[2rem] shadow-xl shadow-blue-600/20 relative overflow-hidden group transition-all">
              <div className="relative z-10">
                <h3 className="text-[10px] font-black text-blue-200 uppercase tracking-[0.2em] mb-4 text-center">Gestion des Flux</h3>
                <p className="text-sm font-bold text-center leading-relaxed mb-6">
                  Injectez de nouvelles ressources dans votre écosystème Nexus.
                </p>
                <button
                  onClick={() => setIsRestocking(true)}
                  className="w-full bg-nexus-surface text-blue-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-500/5 dark:bg-slate-500/5 dark:bg-white/5 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <ArrowRightLeft size={16} /> RÉAPPROVISIONNER
                </button>
              </div>
              <Package className="absolute -bottom-8 -right-8 text-white/10 group-hover:rotate-12 transition-all duration-700" size={160} />
            </section>

            <section className="bg-nexus-accent text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
               <ShieldCheck className="absolute top-4 right-4 text-blue-500 opacity-20" size={48} />
               <h3 className="text-[10px] font-black text-nexus-text-muted/80 uppercase tracking-[0.2em] mb-4">Audit Nexus</h3>
               <p className="text-xs font-medium text-nexus-text-muted leading-relaxed mb-6">
                 Tous vos mouvements de stock sont tracés et auditables.
               </p>
               <button 
                 onClick={() => setActiveTab('movements')}
                 className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors"
               >
                 VOIR HISTORIQUE →
               </button>
            </section>
          </div>
        </div>
      ) : activeTab === 'ecommerce' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           <div className="lg:col-span-1 bg-nexus-surface rounded-[2rem] p-8 border border-nexus-border/30 shadow-sm space-y-6">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                   <Plus size={20} />
                </div>
                <h3 className="text-xl font-black text-nexus-text tracking-tight">Nouvel Article</h3>
             </div>
               <form 
                 onSubmit={async (e) => {
                   e.preventDefault();
                   if (!currentCompany || submitting) return;
                   setSubmitting(true);
                   const fData = new FormData(e.currentTarget);
                   try {
                     await addDoc(collection(db, 'products'), {
                       companyId: currentCompany.id,
                       name: fData.get('name'),
                       description: fData.get('description'),
                       price: Number(fData.get('price')),
                       category: fData.get('category'),
                       stock: Number(fData.get('stock')),
                       points: Number(fData.get('points')),
                       configOptions: fData.get('configOptions'), // New field
                       image: imagePreview || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600',
                       createdAt: serverTimestamp()
                     });
                     (e.target as HTMLFormElement).reset();
                     setImagePreview(null);
                     alert('Article ajouté au catalogue Nexus.');
                   } catch(err) {
                     handleFirestoreError(err, OperationType.CREATE, 'products');
                   } finally {
                     setSubmitting(false);
                   }
                 }}
                 className="space-y-4"
               >
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-nexus-text-muted uppercase tracking-widest ml-1">Désignation</label>
                    <input name="name" placeholder="ex: Serveur Nexus V3" className="w-full rounded-xl text-sm font-medium hover:-strong nexus-input w-full text-sm" required />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-nexus-text-muted uppercase tracking-widest ml-1">Spécifications & Détails</label>
                    <textarea name="description" placeholder="Détails techniques du produit..." className="w-full rounded-xl text-sm h-28 hover:-strong nexus-input w-full text-sm" required />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-nexus-text-muted uppercase tracking-widest ml-1">Options de Configuration (Variantes)</label>
                    <textarea name="configOptions" placeholder="ex: Couleurs: Noir, Blanc; Stockage: 512GB, 1TB" className="w-full rounded-xl text-[10px] h-24 hover:-strong nexus-input w-full text-sm" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-nexus-text-muted uppercase tracking-widest ml-1">Prix (XAF)</label>
                      <input name="price" type="number" placeholder="0" className="w-full rounded-xl text-sm font-black hover:-strong nexus-input w-full text-sm" required />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-nexus-text-muted uppercase tracking-widest ml-1">Stock Initial</label>
                      <input name="stock" type="number" placeholder="0" className="w-full rounded-xl text-sm font-black hover:-strong nexus-input w-full text-sm" required />
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-nexus-text-muted uppercase tracking-widest ml-1">Secteur</label>
                      <select name="category" className="w-full rounded-xl text-sm font-bold hover:-strong nexus-input w-full text-sm">
                        {['Hardware', 'Software', 'Office', 'Services'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-nexus-text-muted uppercase tracking-widest ml-1">Poids Fidélité</label>
                      <input name="points" type="number" placeholder="Pts" className="w-full rounded-xl text-sm font-black hover:-strong nexus-input w-full text-sm" required />
                   </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-nexus-text-muted uppercase tracking-widest ml-1">Image (Pick from Phone)</label>
                    <div className="relative group">
                       <input 
                         type="file" 
                         accept="image/*"
                         onChange={handleFileChange}
                         className="hidden text-nexus-text placeholder-white/40" 
                         id="product-image-upload"
                       />
                       <label 
                         htmlFor="product-image-upload"
                         className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-nexus-border/50 rounded-2xl cursor-pointer bg-slate-500/5 dark:bg-slate-500/5 dark:bg-white/5 hover:bg-slate-100 transition-all hover:border-blue-300 overflow-hidden"
                       >
                         {imagePreview ? (
                           <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                         ) : (
                           <div className="flex flex-col items-center justify-center pt-5 pb-6">
                             <Smartphone className="w-8 h-8 text-nexus-text-muted mb-2" />
                             <p className="text-[9px] font-black text-nexus-text-muted uppercase">Cliquez pour ajouter une photo</p>
                           </div>
                         )}
                       </label>
                       {imagePreview && (
                         <button 
                           type="button"
                           onClick={() => setImagePreview(null)}
                           className="absolute top-2 right-2 p-1 bg-nexus-surface/80 rounded-full text-red-500 hover:bg-black hover:text-white transition-all shadow-sm"
                         >
                           <X size={12} />
                         </button>
                       )}
                    </div>
                 </div>
                 <button type="submit" disabled={submitting} className="w-full py-4 bg-nexus-accent text-white rounded-xl font-black uppercase tracking-widest hover:bg-nexus-accent text-white hover:bg-nexus-accent-hover shadow-lg hover:shadow-nexus-accent/20 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 disabled:opacity-50">
                   {submitting ? 'Synchronisation...' : <><Plus size={18} /> Déployer l'article</>}
                 </button>
               </form>
           </div>

           <div className="lg:col-span-3 bg-nexus-surface rounded-[2.5rem] border border-nexus-border/30 shadow-sm overflow-hidden flex flex-col h-fit">
             <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-500/5 dark:bg-slate-500/5 dark:bg-white/5/30">
               <div>
                  <h3 className="text-xl font-black text-nexus-text tracking-tight">Inventaire E-commerce</h3>
                  <p className="text-[10px] font-black text-nexus-text-muted uppercase tracking-widest mt-1">Supervision du catalogue boutique</p>
               </div>
               <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-nexus-surface rounded-xl border border-nexus-border/50 border border-nexus-border/30 text-[10px] font-black text-nexus-text-muted/80 uppercase tracking-widest">
                     {products.length} Solutions
                  </div>
               </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full">
                   <thead>
                     <tr className="bg-slate-500/5 dark:bg-slate-500/5 dark:bg-white/5/50">
                       <th className="px-8 py-5 text-left text-[10px] font-black text-nexus-text-muted uppercase tracking-widest">Article / Solution</th>
                       <th className="px-8 py-5 text-left text-[10px] font-black text-nexus-text-muted uppercase tracking-widest">Secteur</th>
                       <th className="px-8 py-5 text-left text-[10px] font-black text-nexus-text-muted uppercase tracking-widest">Prix Unitaire</th>
                       <th className="px-8 py-5 text-left text-[10px] font-black text-nexus-text-muted uppercase tracking-widest">Stock Disponible</th>
                       <th className="px-8 py-5 text-right text-[10px] font-black text-nexus-text-muted uppercase tracking-widest">Configuration</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {products.map(p => (
                       <tr key={p.id} className="hover:bg-blue-50/30 transition-all group">
                         <td className="px-8 py-5">
                           <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-xl overflow-hidden border border-nexus-border/30 shadow-sm group-hover:scale-110 transition-transform">
                                <img src={p.image} className="w-full h-full object-cover" />
                             </div>
                             <div>
                                <p className="font-black text-nexus-text text-sm">{p.name}</p>
                                <p className="text-[10px] font-medium text-nexus-text-muted truncate max-w-[150px]">{p.description}</p>
                                {p.configOptions && (
                                  <p className="text-[9px] font-black text-blue-600 uppercase mt-1 flex items-center gap-1">
                                    <CheckCircle2 size={10} /> Configuré
                                  </p>
                                )}
                             </div>
                           </div>
                         </td>
                         <td className="px-8 py-5">
                            <span className="px-3 py-1 bg-slate-100 text-nexus-text-muted/80 rounded-full text-[9px] font-black uppercase tracking-widest">
                               {p.category}
                            </span>
                         </td>
                         <td className="px-8 py-5 text-sm font-black text-nexus-text">
                            {p.price.toLocaleString()} <span className="text-[10px] text-nexus-text-muted ml-1">XAF</span>
                         </td>
                         <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                               <div className={cn(
                                 "w-2 h-2 rounded-full",
                                 p.stock > 10 ? "bg-green-500" : p.stock > 0 ? "bg-amber-500" : "bg-red-500"
                               )} />
                               <span className={cn(
                                 "text-sm font-black",
                                 p.stock > 10 ? "text-nexus-text" : p.stock > 0 ? "text-amber-600" : "text-red-600"
                               )}>{p.stock}</span>
                            </div>
                         </td>
                         <td className="px-8 py-5 text-right">
                            <div className="flex justify-end gap-3 translate-x-4 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all">
                               <button 
                                 onClick={() => { setEditingProduct(p); setImagePreview(p.image); }}
                                 className="p-3 bg-blue-50 text-blue-600 hover:bg-nexus-accent text-white hover:bg-nexus-accent-hover shadow-lg hover:shadow-nexus-accent/20 hover:text-white rounded-xl transition-all shadow-sm"
                               >
                                 <Edit2 size={16} />
                               </button>
                               <button 
                                 onClick={async () => {
                                   if (confirm('Voulez-vous supprimer cet article définitivement du catalogue Nexus ?')) {
                                     await deleteDoc(doc(db, 'products', p.id)).catch(err => handleFirestoreError(err, OperationType.DELETE, 'products'));
                                   }
                                 }}
                                 className="p-3 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm"
                               >
                                 <Trash2 size={16} />
                               </button>
                            </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                </table>
             </div>
           </div>
        </div>
      ) : activeTab === 'movements' ? (
        <div className="bg-nexus-surface border border-nexus-border rounded-[2rem] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-nexus-border/30 flex justify-between items-center bg-slate-500/5 dark:bg-slate-500/5 dark:bg-white/5/30">
            <div>
              <h3 className="text-lg font-bold text-nexus-text leading-none mb-1 text-left">Journal Stratégique des Mouvements</h3>
              <p className="text-xs font-medium text-nexus-text-muted text-left">Audit complet de tous les flux entrants et sortants.</p>
            </div>
            <RefreshCw size={24} className="text-blue-200" />
          </div>
          <Table headers={['Date', 'Type', 'Article', 'Quantité', 'Source', 'Opérateur']}>
            {movementLogs.map((log) => (
              <TableRow key={log.id}>
                <span className="font-mono text-[10px] text-nexus-text-muted">
                  {log.date ? new Date(log.date.seconds * 1000).toLocaleString() : 'PENDING'}
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                  log.type === 'IN' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                  {log.type === 'IN' ? 'Entrée' : 'Sortie'}
                </span>
                <span className="font-bold text-nexus-text">{log.resourceName}</span>
                <span className="font-black text-nexus-text font-mono">{log.quantity}</span>
                <span className="text-nexus-text-muted/80 font-medium italic">{log.supplier || 'Interne'}</span>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[8px] font-black">
                    {log.performedBy?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[10px] text-nexus-text-muted font-bold truncate max-w-[80px]">{log.performedBy}</span>
                </div>
              </TableRow>
            ))}
            {movementLogs.length === 0 && (
              <div className="p-20 text-center text-nexus-text-muted italic text-sm">
                Aucun mouvement critique enregistré.
              </div>
            )}
          </Table>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-nexus-surface p-8 rounded-[2rem] border border-nexus-border/30 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full translate-x-12 -translate-y-12 transition-transform group-hover:scale-110" />
              <p className="text-[10px] font-black uppercase text-nexus-text-muted tracking-widest mb-3 relative">Volume Entrant (IN)</p>
              <div className="flex items-center gap-3 relative">
                <span className="text-3xl font-black text-emerald-600">{movementsStats.totalIn}</span>
                <span className="text-[10px] font-bold text-emerald-100 bg-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-tighter">Total</span>
              </div>
            </div>
            <div className="bg-nexus-surface p-8 rounded-[2rem] border border-nexus-border/30 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full translate-x-12 -translate-y-12 transition-transform group-hover:scale-110" />
              <p className="text-[10px] font-black uppercase text-nexus-text-muted tracking-widest mb-3 relative">Volume Sortant (OUT)</p>
              <div className="flex items-center gap-3 relative">
                <span className="text-3xl font-black text-red-600">{movementsStats.totalOut}</span>
                <span className="text-[10px] font-bold text-red-100 bg-red-600 px-2 py-0.5 rounded-full uppercase tracking-tighter">Total</span>
              </div>
            </div>
            <div className="bg-nexus-accent p-8 rounded-[2rem] border border-nexus-border shadow-xl relative overflow-hidden col-span-1 md:col-span-2 group">
              <div className="absolute bottom-0 right-0 w-48 h-48 bg-nexus-accent text-white hover:bg-nexus-accent-hover shadow-lg hover:shadow-nexus-accent/20/10 rounded-full translate-x-16 translate-y-16 transition-transform group-hover:scale-110" />
              <p className="text-[10px] font-black uppercase text-nexus-text-muted/80 tracking-widest mb-3 relative">Balance des Flux (Net)</p>
              <div className="flex items-center gap-4 relative">
                <span className={cn(
                  "text-4xl font-black italic tracking-tighter",
                  fluxBalance >= 0 ? "text-blue-500" : "text-amber-500"
                )}>
                  {fluxBalance > 0 ? '+' : ''}{fluxBalance} <span className="text-sm font-black uppercase not-italic text-nexus-text-muted">Unités</span>
                </span>
                <div className="p-3 bg-slate-500/5 dark:bg-slate-500/5 dark:bg-white/5 rounded-2xl border border-nexus-border/50 backdrop-blur-md">
                   <TrendingUp size={24} className={fluxBalance >= 0 ? "text-blue-400" : "text-amber-400"} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-nexus-surface border border-nexus-border p-10 rounded-[2.5rem] shadow-sm flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-20 h-20 bg-slate-500/5 dark:bg-slate-500/5 dark:bg-white/5 rounded-3xl flex items-center justify-center text-nexus-text-muted">
                <Activity size={40} />
              </div>
              <h3 className="text-2xl font-black text-nexus-text uppercase tracking-tight">Analyse de Performance</h3>
              <p className="text-nexus-text-muted text-sm font-medium leading-relaxed max-w-sm">
                Une fois que vous aurez enregistré plus de 10 mouvements IN/OUT, Nexus affichera ici une courbe de tendance prédictive pour anticiper vos besoins de réapprovisionnement.
              </p>
            </div>
            <div className="bg-nexus-surface border border-nexus-border p-10 rounded-[2.5rem] shadow-sm space-y-8">
              <h3 className="text-[10px] font-black text-nexus-text-muted uppercase tracking-[0.2em] mb-4">Mouvements Récents</h3>
              <div className="space-y-4">
                {movementLogs.slice(0, 5).map((log, i) => (
                   <div key={i} className="flex items-center justify-between p-4 bg-slate-500/5 dark:bg-slate-500/5 dark:bg-white/5 rounded-2xl border border-nexus-border/30 hover:bg-slate-100 transition-all group">
                     <div className="flex items-center gap-4">
                       <div className={cn(
                         "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-12",
                         log.type === 'IN' ? "bg-emerald-100 text-emerald-600 uppercase font-black text-[10px]" : "bg-red-100 text-red-600 uppercase font-black text-[10px]"
                       )}>
                         {log.type}
                       </div>
                       <div>
                         <p className="font-bold text-nexus-text text-sm">{log.resourceName}</p>
                         <p className="text-[10px] font-medium text-nexus-text-muted">{log.performedBy}</p>
                       </div>
                     </div>
                     <span className="font-black text-nexus-text">
                       {log.type === 'IN' ? '+' : '-'}{log.quantity}
                     </span>
                   </div>
                ))}
                {movementLogs.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-12 text-nexus-text-muted space-y-4">
                    <Package size={48} className="opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">Aucun flux détecté</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals for Adding/Restocking/Editing Product */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-nexus-surface rounded-[2rem] p-6 md:p-8 max-w-2xl w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-nexus-border/30 animate-in fade-in zoom-in duration-300 scrollbar-hide">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl md:text-2xl font-black text-nexus-text uppercase tracking-tight">MODIFIER L'ARTICLE</h2>
              <button onClick={() => { setEditingProduct(null); setImagePreview(null); }} className="p-2 hover:bg-slate-100 rounded-full text-nexus-text-muted transition-colors">
                <X size={20} />
              </button>
            </div>
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editingProduct || submitting) return;
                setSubmitting(true);
                const fData = new FormData(e.currentTarget);
                try {
                  await updateDoc(doc(db, 'products', editingProduct.id), {
                    name: fData.get('name'),
                    description: fData.get('description'),
                    price: Number(fData.get('price')),
                    category: fData.get('category'),
                    stock: Number(fData.get('stock')),
                    points: Number(fData.get('points')),
                    configOptions: fData.get('configOptions'),
                    image: imagePreview || editingProduct.image
                  });
                  setEditingProduct(null);
                  setImagePreview(null);
                  alert('Article mis à jour avec succès.');
                } catch(err) {
                  handleFirestoreError(err, OperationType.UPDATE, 'products');
                } finally {
                  setSubmitting(false);
                }
              }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-nexus-text-muted uppercase ml-1">Nom de l'Article</label>
                  <input name="name" defaultValue={editingProduct.name} className="w-full rounded-xl text-sm font-bold hover:-strong nexus-input w-full text-sm" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-nexus-text-muted uppercase ml-1">Catégorie</label>
                  <select name="category" defaultValue={editingProduct.category} className="w-full rounded-xl text-sm font-bold hover:-strong nexus-input w-full text-sm">
                    {['Hardware', 'Software', 'Office', 'Services'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-nexus-text-muted uppercase ml-1">Prix (XAF)</label>
                  <input name="price" type="number" defaultValue={editingProduct.price} className="w-full rounded-xl text-sm font-black hover:-strong nexus-input w-full text-sm" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-nexus-text-muted uppercase ml-1">Stock</label>
                  <input name="stock" type="number" defaultValue={editingProduct.stock} className="w-full rounded-xl text-sm font-black hover:-strong nexus-input w-full text-sm" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-nexus-text-muted uppercase ml-1">Description Technique</label>
                <textarea name="description" defaultValue={editingProduct.description} className="w-full rounded-xl text-sm font-medium h-28 hover:-strong nexus-input w-full text-sm" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-nexus-text-muted uppercase ml-1">Options & Variantes (Configuration)</label>
                <textarea name="configOptions" defaultValue={editingProduct.configOptions} placeholder="ex: Couleurs: Rouge, Bleu; Tailles: M, L, XL" className="w-full rounded-xl text-xs h-24 hover:-strong nexus-input w-full text-sm" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-nexus-text-muted uppercase ml-1">Points Fidélité</label>
                  <input name="points" type="number" defaultValue={editingProduct.points} className="w-full rounded-xl text-sm font-black hover:-strong nexus-input w-full text-sm" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-nexus-text-muted uppercase ml-1 text-left block w-full">Visuel de l'Article</label>
                  <div className="relative h-[100px]">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden text-nexus-text placeholder-white/40" 
                      id="edit-product-image-upload"
                    />
                    <label 
                      htmlFor="edit-product-image-upload"
                      className="flex items-center justify-center w-full h-full border-2 border-dashed border-nexus-border/30 rounded-xl p-2 cursor-pointer bg-slate-500/5 dark:bg-slate-500/5 dark:bg-white/5 hover:bg-slate-100 hover:border-blue-300 transition-all overflow-hidden"
                    >
                      {imagePreview ? (
                        <img src={imagePreview} className="h-full object-contain" alt="Preview" />
                      ) : (
                        <div className="flex flex-col items-center">
                          <Smartphone className="w-6 h-6 text-nexus-text-muted mb-1" />
                          <span className="text-[8px] font-black text-nexus-text-muted uppercase">Modifier l'image</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <button type="button" onClick={() => { setEditingProduct(null); setImagePreview(null); }} className="order-2 sm:order-1 px-6 py-4 rounded-xl border border-nexus-border/30 text-nexus-text-muted text-[10px] font-black uppercase tracking-widest hover:bg-slate-500/5 dark:bg-slate-500/5 dark:bg-white/5 transition-all">ANNULER</button>
                <button type="submit" disabled={submitting} className="order-1 sm:order-2 px-6 py-4 rounded-xl bg-nexus-accent text-white text-[10px] font-black uppercase tracking-widest hover:bg-nexus-accent text-white hover:bg-nexus-accent-hover shadow-lg hover:shadow-nexus-accent/20 transition-all shadow-lg shadow-slate-200">
                  {submitting ? 'SYNCHRONISATION...' : 'ENREGISTRER LES MODIFICATIONS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-nexus-surface rounded-[2rem] p-8 max-w-2xl w-full shadow-2xl border border-nexus-border/30 animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-nexus-text mb-6 uppercase tracking-tight">
              {editingResource ? 'MODIFIER L\'ACTIF' : 'NOUVEL ACTIF NEXUS'}
            </h2>
            <form onSubmit={handleSaveResource} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-nexus-text-muted uppercase ml-1">Nom de l'Actif</label>
                  <input 
                    type="text" 
                    required
                    className="w-full rounded-xl p-4 text-sm font-bold transition-all hover:-strong nexus-input w-full text-sm" 
                    value={formData.name || ''} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-nexus-text-muted uppercase ml-1">Catégorie Nexus</label>
                  <select 
                    className="w-full rounded-xl p-4 text-sm font-bold hover:-strong nexus-input w-full text-sm" 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="Stock">Stock Consommable</option>
                    <option value="Matériel">Matériel Tech / Bureau</option>
                    <option value="Logiciel">Licences Logiciels</option>
                    <option value="Véhicule">Logistique / Véhicules</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-nexus-text-muted uppercase ml-1">Quantité Initialisé</label>
                  <input 
                    type="number" 
                    required
                    className="w-full rounded-xl p-4 text-sm font-bold hover:-strong nexus-input w-full text-sm" 
                    value={formData.quantity} 
                    onChange={e => setFormData({...formData, quantity: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-nexus-text-muted uppercase ml-1">Emplacement / Zone</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Entrepôt A, Bureau 102"
                    className="w-full rounded-xl p-4 text-sm font-bold hover:-strong nexus-input w-full text-sm" 
                    value={formData.location || ''} 
                    onChange={e => setFormData({...formData, location: e.target.value})} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-6">
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)} 
                  className="px-6 py-4 rounded-xl border border-nexus-border/30 text-nexus-text-muted text-[10px] font-black uppercase tracking-widest hover:bg-slate-500/5 dark:bg-slate-500/5 dark:bg-white/5 transition-all font-mono"
                >
                  ANNULER
                </button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="px-6 py-4 rounded-xl bg-nexus-accent text-white text-[10px] font-black uppercase tracking-widest hover:bg-nexus-accent text-white hover:bg-nexus-accent-hover shadow-lg hover:shadow-nexus-accent/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'TRAITEMENT...' : 'SAUVEGARDER L\'ACTIF'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRestocking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-nexus-surface rounded-[2rem] p-8 max-w-xl w-full shadow-2xl border border-nexus-border/30 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-2xl font-black text-nexus-text mb-6 uppercase tracking-tight text-left">Approvisionnement Nexus</h2>
            <form onSubmit={handleRestock} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-nexus-text-muted uppercase ml-1 text-left block w-full">Sélectionner l'Actif</label>
                <select 
                  required
                  className="w-full rounded-xl p-4 text-sm font-bold hover:-strong nexus-input w-full text-sm" 
                  value={restockData.resourceId} 
                  onChange={e => setRestockData({...restockData, resourceId: e.target.value})}
                >
                  <option value="">Choisir un article...</option>
                  {resources.map(r => (
                    <option key={r.id} value={r.id}>{r.name} (Actuel: {r.quantity})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-nexus-text-muted uppercase ml-1 text-left block w-full">Quantité Entrante</label>
                  <input 
                    type="number" 
                    required
                    className="w-full rounded-xl p-4 text-sm font-bold hover:-strong nexus-input w-full text-sm" 
                    value={restockData.quantity} 
                    onChange={e => setRestockData({...restockData, quantity: Number(e.target.value)})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-nexus-text-muted uppercase ml-1 text-left block w-full">Source / Fournisseur</label>
                  <input 
                    type="text" 
                    className="w-full rounded-xl p-4 text-sm font-bold hover:-strong nexus-input w-full text-sm" 
                    value={restockData.supplier} 
                    onChange={e => setRestockData({...restockData, supplier: e.target.value})} 
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-nexus-text-muted uppercase ml-1 text-left block w-full">Notes de Mouvement</label>
                <textarea 
                  className="w-full rounded-xl p-4 text-sm font-bold h-24 hover:-strong nexus-input w-full text-sm" 
                  value={restockData.notes} 
                  onChange={e => setRestockData({...restockData, notes: e.target.value})}
                  placeholder="Justificatif, numéro de bon, etc."
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-6">
                <button 
                  type="button" 
                  onClick={() => setIsRestocking(false)} 
                  className="px-6 py-4 rounded-xl border border-nexus-border/30 text-nexus-text-muted text-[10px] font-black uppercase tracking-widest hover:bg-slate-500/5 dark:bg-slate-500/5 dark:bg-white/5 transition-all font-mono"
                >
                  ANNULER
                </button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="px-6 py-4 rounded-xl bg-nexus-accent text-white hover:bg-nexus-accent-hover shadow-lg hover:shadow-nexus-accent/20 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                >
                  {submitting ? 'VALIDATION...' : 'VALIDER L\'ENTRÉE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
